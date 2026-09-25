# OpenApply Autofill (browser extension)

Fills job application forms with your OpenApply profile and the tailored cover letter
and answers written for that job. It never clicks submit: you review every field first.

Works with Greenhouse, Lever, Ashby, SmartRecruiters and most plain HTML forms. Workday
and other multi-step forms work page by page: click **Fill this page** on each step.

## Install (Chrome, Edge, Brave, Arc)

1. Open `chrome://extensions` and switch on **Developer mode**.
2. Click **Load unpacked** and pick this `extension/` folder.
3. In OpenApply, go to **Settings → Autofill browser extension** and create a token.
4. Click the OpenApply icon in your toolbar, open **Settings**, and paste in your server URL
   (for example `https://openapply.example.com`) and the token.

## Use

1. In OpenApply, open an application that is **Ready to apply** and click **Open application page**.
2. Click the extension icon. It matches the page to your saved job automatically, or you can pick one.
3. Click **Fill this page**. Filled fields get a green outline; required fields it couldn't answer get an orange one.
4. Check everything, submit on the site, then click **Mark as applied**.

## Privacy

The extension talks only to the OpenApply server you configure. It reads form labels on the
current tab when you click **Fill** (via `activeTab`) and has no background access to your browsing.
