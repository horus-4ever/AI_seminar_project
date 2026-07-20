from ultralytics import YOLO
from pathlib import Path
from dataclasses import dataclass

"""
[
    'apple', 'banana', 'blue berry', 'bread', 'brinjal', 'butter',
    'cabbage', 'capsicum', 'carrot', 'cheese', 'chicken', 'chocolate',
    'corn', 'cucumber', 'egg', 'flour', 'fresh cream', 'ginger', 'green beans',
    'green chilly', 'green leaves', 'lemon', 'meat', 'milk', 'mushroom',
    'potato', 'shrimp', 'stawberry', 'sweet potato', 'tomato'
]
"""

@dataclass
class PredictionResult:
    pass


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

