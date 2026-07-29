from ultralytics import YOLO
from pathlib import Path
from .utils import PredictionResult


class Model:
    """
    This class is a wrapper around a YOLO model.
    """
    def __init__(self, model):
        self.model = model

    @classmethod
    def load_pretrained(cls, path: Path):
        """
        Load a model from its weights.
        """
        model = YOLO(path)
        return cls(model)
    
    def train(self, data: Path, epochs, imgs=640):
        """
        Train the model on the given dataset. The number of epochs must be specified.
        """
        results = self.model.train(data=data, epochs=epochs, imgsz=imgs)
        return results
        
    def __call__(self, image: Path, confidence=0.7) -> PredictionResult:
        """
        Run the model on inference on the given image.
        The `confidence` parameter is a threshold of confidence to keep the prediction.
        """
        pred_results = self.model.predict(source=image, conf=confidence)
        pred_results = pred_results[0] # we have only one image
        # create a result object, then iter over all the boxes
        result = PredictionResult()
        confidences = {}
        for box in pred_results:
            # get the class name
            cls_id = int(box.cls[0])
            cls_name = self.model.names[cls_id]
            if cls_name not in result.results:
                confidences[cls_name] = 0.0
                result.results[cls_name] = PredictionResult.default_field(name=cls_name)
            # increment the number of detections of this class
            result.results[cls_name] += 1
            confidences[cls_name] += float(box.conf[0])
        # now set the average confidence
        for cls_name, value in confidences.items():
            average_confidence = value / result.results[cls_name]["detected_count"]
            result.results[cls_name]["average_confidence"] = average_confidence
        return result
