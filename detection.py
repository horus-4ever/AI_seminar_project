from ultralytics import YOLO
from pathlib import Path
from dataclasses import dataclass
from typing import ClassVar


@dataclass
class PredictionResult:
    results = {
        'apple': 0, 
        'banana': 0,
        'blue berry': 0,
        'bread': 0,
        'brinjal': 0,
        'butter': 0,
        'cabbage': 0,
        'capsicum': 0,
        'carrot': 0,
        'cheese': 0,
        'chicken': 0,
        'chocolate': 0,
        'corn': 0,
        'cucumber': 0,
        'egg': 0,
        'flour': 0,
        'fresh cream': 0,
        'ginger': 0,
        'green beans': 0,
        'green chilly': 0,
        'green leaves': 0,
        'lemon': 0,
        'meat': 0,
        'milk': 0,
        'mushroom': 0,
        'potato': 0,
        'shrimp': 0,
        'stawberry': 0,
        'sweet potato': 0,
        'tomato': 0
    }
    


class Model:
    def __init__(self, model):
        self.model = model

    @classmethod
    def load_pretrained(cls, path: Path):
        model = YOLO(path)
        return cls(model)
    
    def train(self, data: Path, epochs, imgs=640):
        results = self.model.train(data=data, epochs=epochs, imgsz=imgs)
        
    def __call__(self, image: Path, confidence=0.7):
        results = self.model.predict(source=image, conf=confidence)

