// Injected into the application page (all frames). Defines window.__openapplyFill,
// which the popup calls with the user's profile + selected application.
// Heuristic: read each field's label text, map it to a profile value or a
// tailored answer, and set it the way React/Vue forms expect. Never submits.

(() => {
  if (window.__openapplyFill) return;

  const FILLED = "2px solid #0d7a5f";
  const TODO = "2px solid #e08a00";

  function labelText(el) {
    const parts = [];
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) parts.push(l.innerText);
    }
    const wrapping = el.closest("label");
    if (wrapping) parts.push(wrapping.innerText);
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      for (const id of labelledBy.split(/\s+/)) {
        const n = document.getElementById(id);
        if (n) parts.push(n.innerText);
      }
    }
    parts.push(el.getAttribute("aria-label") || "", el.getAttribute("placeholder") || "");
    parts.push(el.getAttribute("data-automation-id") || "", el.name || "", el.id || "");
    // Nearest preceding text in the same field container (Workday, Ashby, custom forms).
    const container = el.closest(
      "[data-automation-id^='formField'], .field, .form-group, .application-question, .ashby-application-form-field-entry, fieldset, li, div",
    );
    if (container && parts.join("").trim().length < 3) parts.push(container.innerText.slice(0, 300));
    return parts.join(" ").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function visible(el) {
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.type === "file");
  }

  function setValue(el, value) {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : el instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    el.focus();
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
  }

  function chooseOption(select, wanted) {
    const w = String(wanted).toLowerCase();
    const opts = [...select.options].filter((o) => o.value !== "");
    const hit =
      opts.find((o) => o.text.trim().toLowerCase() === w) ||
      opts.find((o) => o.text.toLowerCase().startsWith(w)) ||
      opts.find((o) => o.text.toLowerCase().includes(w));
    if (!hit) return false;
    setValue(select, hit.value);
    return true;
  }

  const SENSITIVE = /gender|pronoun|race|ethnic|hispanic|latin|veteran|disabilit|sexual orientation|transgender|demographic/;

  function isCombobox(el) {
    return (
      el instanceof HTMLInputElement &&
      (el.getAttribute("role") === "combobox" || el.hasAttribute("aria-autocomplete") || el.closest("[class*='select__control']") != null)
    );
  }

  const words = (s) => new Set(String(s).toLowerCase().match(/[a-z0-9]{3,}/g) || []);

  function bestAnswer(label, answers) {
    let best = null;
    let bestScore = 0;
    const lw = words(label);
    for (const a of answers) {
      const qw = words(a.question);
      if (!qw.size) continue;
      let overlap = 0;
      for (const w of qw) if (lw.has(w)) overlap++;
      const score = overlap / qw.size;
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    return bestScore >= 0.5 ? best.answer : null;
  }

  function rules(p, app) {
    const links = p.links || {};
    const yesNo = (b) => (b == null ? null : b ? "Yes" : "No");
    return [
      [/first.?name|given.?name|fname|legalnamesection_firstname/, p.first_name],
      [/last.?name|family.?name|surname|lname|legalnamesection_lastname/, p.last_name],
      [/preferred.?name/, p.first_name],
      [/full.?name|^name\b|your name|\bname\b(?!.*(company|school|employer|reference))/, p.full_name],
      [/e-?mail/, p.email],
      [/phone|mobile|telephone/, p.phone],
      [/linkedin/, links.linkedin],
      [/github/, links.github],
      [/portfolio|personal.?(site|website)|website|blog|url/, links.portfolio || links.website || links.github || links.linkedin],
      [/current.?(company|employer)|most recent (company|employer)|^company\b/, p.current_company],
      [/current.?(title|role|position)|job title|headline/, p.current_title],
      [/city|location|address|where.*(based|located|live)/, p.location],
      [/school|university|college|institution/, p.school],
      [/degree/, p.degree],
      [/field of study|major|discipline/, p.field_of_study],
      [/graduat/, p.graduation_year],
      [/salary|compensation|pay expectation|desired pay/, p.salary_expectation],
      [/notice period|start date|when can you start|availability/, p.notice_period],
      [/sponsor/, yesNo(p.needs_sponsorship)],
      [/authori[sz]ed|legally (able|eligible)|right to work|work permit|visa status/, p.work_authorization || (p.needs_sponsorship === false ? "Yes" : null)],
      [/cover.?letter|why .*(interested|join|work here|company)|motivation|additional information|anything else/, app?.cover_letter],
      [/summary|about (you|yourself)|tell us about/, app?.tailored_summary || p.summary],
    ];
  }

  async function attachResume(input, resume) {
    if (!resume?.url) return false;
    try {
      const res = await fetch(resume.url);
      if (!res.ok) return false;
      const blob = await res.blob();
      const file = new File([blob], resume.filename || "resume.pdf", { type: blob.type || "application/pdf" });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch {
      return false;
    }
  }

  window.__openapplyFill = async function (payload) {
    const p = payload?.profile || {};
    const app = payload?.application || null;
    const standard = Object.entries(p.standard_answers || {}).map(([question, answer]) => ({ question, answer }));
    const answers = [...((app && app.answers) || []), ...standard];
    const table = rules(p, app);
    let filled = 0;
    let skipped = 0;
    let resume = false;

    const fields = [...document.querySelectorAll("input, textarea, select")].filter((el) => {
      if (el.disabled || el.readOnly) return false;
      if (el instanceof HTMLInputElement && ["hidden", "submit", "button", "reset", "image", "password", "search"].includes(el.type)) return false;
      return visible(el);
    });

    for (const el of fields) {
      const label = labelText(el);
      if (!label) continue;

      if (el instanceof HTMLInputElement && el.type === "file") {
        if (/resume|cv|curriculum/.test(label) && !/cover/.test(label) && !resume && (!el.files || el.files.length === 0)) {
          resume = await attachResume(el, payload.resume);
          if (resume) el.style.outline = FILLED;
        }
        continue;
      }

      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) continue;
      if (el.value && el.value.trim() && !(el instanceof HTMLSelectElement)) continue;

      // Voluntary demographic (EEO) questions: only ever filled from the user's own saved answers.
      if (SENSITIVE.test(label)) {
        const own = bestAnswer(label, standard);
        if (own && !isCombobox(el)) {
          const ok = el instanceof HTMLSelectElement ? chooseOption(el, own) : (setValue(el, own), true);
          if (ok) {
            el.style.outline = FILLED;
            filled++;
          }
        }
        continue;
      }

      // Autocomplete widgets (react-select etc.) discard programmatic values — leave for the user.
      if (isCombobox(el)) {
        if (el.required || el.getAttribute("aria-required") === "true" || /\*/.test(label)) {
          el.style.outline = TODO;
          skipped++;
        }
        continue;
      }

      let value = null;
      // Specific screening answers first for long-form fields, then profile rules.
      if (el instanceof HTMLTextAreaElement) value = bestAnswer(label, answers);
      if (value == null) {
        for (const [re, v] of table) {
          if (re.test(label) && v) {
            value = v;
            break;
          }
        }
      }
      if (value == null) value = bestAnswer(label, answers);

      if (value == null) {
        if (el.required || el.getAttribute("aria-required") === "true") {
          el.style.outline = TODO;
          skipped++;
        }
        continue;
      }

      const ok =
        el instanceof HTMLSelectElement ? chooseOption(el, value) : (setValue(el, String(value)), el.value.trim() !== "");
      if (ok) {
        el.style.outline = FILLED;
        filled++;
      } else {
        el.style.outline = TODO;
        skipped++;
      }
    }

    return { filled, skipped, resume };
  };
})();
