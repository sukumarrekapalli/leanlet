# Model and runtime notices

Leanlet's demo bundles the Small and Medium ONNX Community conversions of
`timm` MobileNetV4 models. Review the upstream model cards and licenses before
redistributing or replacing the weights:

- https://huggingface.co/onnx-community/mobilenetv4_conv_small.e2400_r224_in1k
- https://huggingface.co/timm/mobilenetv4_conv_small.e2400_r224_in1k
- https://huggingface.co/onnx-community/mobilenetv4_conv_medium.e500_r224_in1k
- https://huggingface.co/timm/mobilenetv4_conv_medium.e500_r224_in1k

The three MobileCLIP profiles use `Xenova/mobileclip_s0`, an ONNX conversion of
Apple's MobileCLIP-S0. Its upstream repository marks the model
license as `other`; the exact license text is included beside the local model
assets and must remain with redistributed weights:

- https://huggingface.co/Xenova/mobileclip_s0
- https://github.com/apple/ml-mobileclip

Browser inference uses Transformers.js and ONNX Runtime Web. Their licenses are
included with their npm packages and remain applicable to redistributed assets.
