# Model and runtime notices

Leanlet's demo bundles `onnx-community/mobilenetv4_conv_small.e2400_r224_in1k`,
an ONNX conversion of the corresponding `timm` MobileNetV4 model. Review the
upstream model card and license before redistributing or replacing the weights:

- https://huggingface.co/onnx-community/mobilenetv4_conv_small.e2400_r224_in1k
- https://huggingface.co/timm/mobilenetv4_conv_small.e2400_r224_in1k

The recommended and compact profiles bundle `Xenova/mobileclip_s0`, an ONNX
conversion of Apple's MobileCLIP-S0. Its upstream repository marks the model
license as `other`; the exact license text is included beside the local model
assets and must remain with redistributed weights:

- https://huggingface.co/Xenova/mobileclip_s0
- https://github.com/apple/ml-mobileclip

Browser inference uses Transformers.js and ONNX Runtime Web. Their licenses are
included with their npm packages and remain applicable to redistributed assets.
