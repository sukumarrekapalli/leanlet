# Language-identification reference adapter

The website's language case and SafeShare reference application use ELD 2.1.0
as a real statistical language detector. ELD is loaded in a dedicated module
worker; text is not sent to an inference service.

This adapter is part of the reference application, not a public export of the
`leanlet-ai` package in 0.3.0 beta. It demonstrates how a third-party local
model fits the kernel lifecycle contract.

## Behavior contract

- Input: a UTF-8 JavaScript string.
- Output: ISO 639-1 leading candidate, English display name, model score,
  ELD reliability flag, up to three candidates, and selected profile ID.
- Uncertain result: the display language is `Uncertain`; the leading candidate
  remains diagnostic evidence and the SafeShare policy adds a review finding.
- Coverage: the full 60-language database shipped by ELD is enabled. The
  adapter does not define a language subset.
- Unsupported language: no model can identify literally every language. Text
  outside the model's coverage, text with too little evidence, and some mixed
  language inputs can be uncertain or incorrect and must be evaluated.
- Display names: language codes are formatted with `Intl.DisplayNames`; there
  is no application-maintained code-to-name table.

The adapter contains no script matching, vocabulary list, or English fallback.
Do not add one to hide an uncertain result. Preserve uncertainty in the product
contract.

## Profiles

| ID | Packaged data | ELD reported memory | Intended tradeoff |
| --- | ---: | ---: | --- |
| `eld-extrasmall` | ~294 KB gzip | 37 MB | Default, lowest transfer and memory |
| `eld-small` | ~477 KB gzip | 54 MB | Intermediate database |
| `eld-medium` | ~586 KB gzip | 71 MB | Larger database |
| `eld-large` | ~1.28 MB gzip | 138 MB | Largest current profile |

Transfer figures are rounded from the current production build and are not a
permanent promise. Actual transfer depends on the bundler, minification,
compression, cache state, and shared chunks. Measure every built deployment.

## Lifecycle

1. The selected profile is registered with `network: 'static-assets'` and a
   conservative resident-memory estimate.
2. Each profile has its own build entry. Kernel prewarm creates the selected
   named module worker, so the browser requests only that profile's worker asset.
3. Detection executes inside the worker and returns serializable typed
   evidence.
4. Cancellation rejects result delivery and asks the worker to discard the
   request. Synchronous n-gram calculation may finish before cancellation is
   observed.
5. A profile switch or kernel destruction terminates the worker, rejects
   pending work, and releases its model reference.

## Production validation

Build a labeled corpus that reflects supported languages, code-switching,
transliteration, punctuation, message length, and noisy user input. Report
coverage separately from accepted accuracy. Test cold load, warm latency,
worker failure, navigation cancellation, memory pressure, and unsupported
languages on each supported device class.

ELD is Apache-2.0 licensed. Preserve its license and review the upstream
project before redistribution: <https://github.com/nitotm/efficient-language-detector-js>.
