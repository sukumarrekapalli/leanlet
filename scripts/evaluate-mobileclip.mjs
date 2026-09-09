import {
  AutoProcessor, AutoTokenizer, CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection, dot, env, RawImage, softmax,
} from '@huggingface/transformers';
import { resolve } from 'node:path';

const imagePath = process.argv[2];
if (!imagePath) throw new Error('Usage: node scripts/evaluate-mobileclip.mjs <image>');

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = `${resolve('public/models')}/`;

const categories = [
  'Electronics', 'Fashion & Accessories', 'Home & Furniture', 'Kitchen & Appliances',
  'Food & Grocery', 'Beauty & Personal Care', 'Sports & Outdoors', 'Automotive',
  'Books & Office', 'Tools & Hardware', 'Toys & Kids', 'Jewelry & Watches',
  'Health & Medical', 'Industrial & Construction', 'Other product',
];

const modelId = 'Xenova/mobileclip_s0';
const [tokenizer, textModel, processor, visionModel] = await Promise.all([
  AutoTokenizer.from_pretrained(modelId),
  CLIPTextModelWithProjection.from_pretrained(modelId, { dtype: 'q8' }),
  AutoProcessor.from_pretrained(modelId),
  CLIPVisionModelWithProjection.from_pretrained(modelId, { dtype: 'fp32' }),
]);
const image = await RawImage.read(resolve(imagePath));
const descriptions = {
  Electronics: 'a smartphone, mobile phone, laptop, computer, camera, headphones, television, charger, or electronic device',
  'Fashion & Accessories': 'clothing, shoes, a handbag, sunglasses, or a fashion accessory',
  'Home & Furniture': 'a chair, table, sofa, bed, lamp, rug, decor, or home furnishing',
  'Kitchen & Appliances': 'cookware, tableware, a refrigerator, mixer, kettle, or kitchen appliance',
  'Food & Grocery': 'packaged food, a beverage, fruit, vegetables, snacks, or groceries',
  'Beauty & Personal Care': 'cosmetics, skincare, shampoo, soap, perfume, grooming, or personal care',
  'Sports & Outdoors': 'sports equipment, fitness gear, a bicycle, camping, or an outdoor product',
  Automotive: 'a car, motorcycle, tire, vehicle part, or automotive accessory',
  'Books & Office': 'a book, notebook, pen, stationery, printer, or office supply',
  'Tools & Hardware': 'a power tool, hand tool, fastener, building tool, or hardware item',
  'Toys & Kids': 'a toy, game, doll, baby product, stroller, or children’s item',
  'Jewelry & Watches': 'jewelry, a ring, necklace, bracelet, earrings, or a watch',
  'Health & Medical': 'medicine, a health product, medical device, bandage, or healthcare equipment',
  'Industrial & Construction': 'industrial machinery, construction material, safety equipment, or commercial supply',
  'Other product': 'a miscellaneous retail product that does not fit the other product groups',
};
const prompts = categories.map((category) => `a retail catalog photo showing ${descriptions[category] ?? category.toLowerCase()}`);
const textInputs = tokenizer(prompts, { padding: 'max_length', truncation: true });
const { text_embeds: textEmbeds } = await textModel(textInputs);
const imageInputs = await processor(image);
const { image_embeds: imageEmbeds } = await visionModel(imageInputs);
const imageVector = imageEmbeds.normalize().tolist()[0];
const textVectors = textEmbeds.normalize().tolist();
const scores = softmax(textVectors.map((textVector) => 100 * dot(imageVector, textVector)));
const result = categories.map((label, index) => ({ label, score: scores[index] })).sort((a, b) => b.score - a.score);
console.log(JSON.stringify(result.slice(0, 5), null, 2));
