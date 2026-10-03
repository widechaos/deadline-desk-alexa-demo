# Deadline Desk friction log

Date: 2026-10-03. These entries describe tasks actually attempted in this prototype. No native Alexa SDK use is claimed.


| Attempt | Steps taken | Expected / observed | Severity | Workaround / actionable suggestion |
|---|---|---|---|---|
| Start an Alexa+ prototype through official resources | Read the official rules, resources and FAQ; check which native tooling is available to participants. | Expected an accessible native simulator; FAQ says the gated tooling is unavailable to participants | Important | Built the permitted web simulation. Publish a runnable, ungated reference simulator and migration checklist. |
| Route return requests with a small local model | Send a fixed set of 20 requests to the local intent endpoint; compare returned labels with expected labels. | Expected reliable bounded labels; 5 of 20 examples failed in a limited check | Important | Switched to 4B and checked the same held-out set. Provide intent evaluation examples with negative completion cases. |
| Transcribe silent input | Create a silent WAV and send it to the actual local transcription endpoint; inspect the returned transcript. | Expected no transcript; the local recognizer produced text | Important | Reject silent/very quiet decoded audio, review transcripts and show errors. Expose confidence/no-speech signals clearly. |

The last two entries concern tools actually used in this prototype. They are not claims of defects in Amazon APIs.
