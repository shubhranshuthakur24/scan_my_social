# AutoDM Send Me Continuation Todo

## Issue

When a post/reel AutoDM flow sends an opening CTA through comment private reply and the recipient clicks `Send me`, the bootstrap continuation dispatches the flow in `full` mode using the inbound postback message id as `trigger_source_id`.

Because `full` post/reel flows must send a public reply first, the action job rejects the non-numeric DM/postback id and stops before sending the remaining DM reply.

## Implementation Plan

- [x] Confirm the production log sequence: public reply sent, private reply button sent, then postback continuation failed.
- [x] Update bootstrap promotion to continue the remaining DM reply steps instead of restarting the public reply sequence.
- [x] Add focused PHPUnit coverage for the `Send me` continuation path.
- [x] Run Pint on dirty PHP files.
- [x] Run the targeted AutoDM feature test.

## Current Status

Fixed and verified.
