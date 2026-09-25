# 5AM Apply Autofill (browser extension)

Fills job application forms with your 5AM Apply profile and the tailored cover letter
and answers written for that job. It never clicks submit: you review every field first.

Works with Greenhouse, Lever, Ashby, SmartRecruiters and most plain HTML forms. Workday
and other multi-step forms work page by page: click **Fill this page** on each step.

## Install (Chrome, Edge, Brave, Opera)

1. In 5AM Apply, open **Settings → Autofill extension** and click **Download extension**.
2. Unzip it. Open `chrome://extensions` (or `edge://extensions`), switch on **Developer mode**,
   click **Load unpacked** and pick the unzipped folder.
3. 5AM Apply opens by itself. Click **Connect extension**. That's it: no tokens to copy.

The download is built from this folder by `scripts/pack-extension.mjs` on every deploy, with the
site's own address as its server. You can also load this `extension/` folder directly while
developing; the manual token setup in Settings still works for any server.

## Use

1. Open any job application form (or **Apply now** inside 5AM Apply).
2. Click the extension icon. It matches the page to your saved job automatically, or you can pick one.
3. Click **Fill this page**. Filled fields get a green outline; required fields it couldn't answer get an orange one.
4. Check everything, submit on the site, then click **Mark as applied**.

## Inside 5AM Apply's apply page

On **Applications → Apply now**, Greenhouse and Lever forms appear embedded next to your answers. Click the extension
there and it fills the embedded form too (Chrome asks once for permission to access those two form sites).

## How connecting works

The manifest has a fixed `key`, so the extension ID is always `afgkfjfmbphhfoofednlhcopigmfmgem`. Pages listed under
`externally_connectable` (your 5AM Apply site) can send it a one-time token; the extension stores it together with the
address of the site that sent it, never an address from the message. **Disconnect** in Settings removes it again.

To publish on the Chrome Web Store, remove `key` from the manifest before uploading and set
`NEXT_PUBLIC_EXTENSION_ID` on the site to the ID the store assigns.

## Privacy

The extension talks only to the 5AM Apply server it's connected to. It reads form labels on the
current tab when you click **Fill** (via `activeTab`) and has no background access to your browsing.
