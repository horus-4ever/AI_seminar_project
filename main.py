import json

from prompt import create_recipe_prompt
from llm import ask_llm
from intelligence import analyze_inventory



from yolo import IngredientDetector


detector = IngredientDetector(
    "best.pt"
)


yolo_output = detector.detect(
    "fridge.jpg"
)as file:

    yolo_output = json.load(file)



smart_inventory = analyze_inventory(
    yolo_output
)



prompt = create_recipe_prompt(
    smart_inventory
)



recipe_response = ask_llm(
    prompt
)



print(recipe_response)