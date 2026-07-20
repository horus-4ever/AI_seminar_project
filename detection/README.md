# Usage
## Class `Model`
The class `Model` is a wrapper that represents a YOLO model to finetune or to run in inference.

## Training the model
```py
# load the model from weights
model = Model.load_pretrained(path)
results = model.train(
    dataset_path,
    epochs,
    image_size
)
```

## Inference
When running in inference, we specify the confidence threshold to keep predictions.
```py
# load the model from weights
model = Model.load_pretrained(path)
result = model(image_path, threshold)
```

The return value is of type `PredictionResult`.
We can get a JSON representation of the result by calling the method `to_json`. This gives a JSON of the following format.
```json
{
    "inventory_summary": [
        {
            "ingredient": ...,
            "detected_count": ...,
            "average_confidence": ...
        },
        ...
    ]
}
```
