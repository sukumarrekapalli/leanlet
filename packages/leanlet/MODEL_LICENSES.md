# Model asset notices

Model weights are not included in this npm package. The `leanlet models add`
command downloads a selected profile from its pinned upstream revision.

The MobileNetV4 profiles use ONNX Community conversions of corresponding
`timm` models:

- https://huggingface.co/onnx-community/mobilenetv4_conv_small.e2400_r224_in1k
- https://huggingface.co/onnx-community/mobilenetv4_conv_medium.e500_r224_in1k

The MobileCLIP profiles use `Xenova/mobileclip_s0`, an ONNX conversion of
Apple's MobileCLIP-S0. Its upstream model repository identifies the license as
`other`; its license file is downloaded beside the model assets and must be
retained when those assets are redistributed:

- https://huggingface.co/Xenova/mobileclip_s0
- https://github.com/apple/ml-mobileclip

Review the current upstream model card and license before distributing any
downloaded model assets. Transformers.js and ONNX Runtime Web retain their own
licenses.
