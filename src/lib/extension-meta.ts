import manifest from "../../extension/manifest.json";

// The autofill extension's fixed ID comes from the "key" in its manifest, so the
// site can talk to the downloaded (unpacked) copy. A Chrome Web Store copy has
// its own ID: set NEXT_PUBLIC_EXTENSION_ID to that when publishing there.
export const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || "afgkfjfmbphhfoofednlhcopigmfmgem";
export const EXTENSION_VERSION: string = manifest.version;
export const EXTENSION_DOWNLOAD = "/downloads/5am-apply-extension.zip";
