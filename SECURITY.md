# Security policy

Please report suspected vulnerabilities privately through GitHub's security
advisory feature for this repository. Do not include private user inputs, model
assets you cannot redistribute, credentials, or exploit details in a public
issue.

Leanlet's manifest policies are admission controls, not a sandbox. Custom
Leanlets run with the application's browser privileges. Applications must use
normal web controls including CSP, origin isolation, dependency review, safe
asset provenance, and output validation.

The project does not collect telemetry or operate an inference service. Security
of the site hosting JavaScript, model, tokenizer, and WASM assets remains part
of the application's supply chain.
