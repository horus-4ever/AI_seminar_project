import json
from datetime import datetime, timedelta


def load_memory():

    with open(
        "kitchen_memory.json",
        "r"
    ) as file:

        return json.load(file)



def analyze_inventory(inventory):

    memory = load_memory()

    enhanced_inventory = inventory


    warnings = []


    for item in inventory["inventory_summary"]:

        ingredient = item["ingredient"]

        confidence = item["average_confidence"]


        # YOLO uncertainty reasoning
        if confidence < 0.75:

            warnings.append(
                f"{ingredient} detection confidence is low. Confirm manually."
            )


        # Expiry prediction
        expiry_days = {

            "milk": 3,
            "tomato": 5,
            "egg": 14

        }


        if ingredient in expiry_days:

            expiry_date = (
                datetime.now()
                +
                timedelta(days=expiry_days[ingredient])
            )


            item["estimated_expiry"] = (
                expiry_date.strftime("%Y-%m-%d")
            )


    enhanced_inventory["kitchen_memory"] = memory

    enhanced_inventory["warnings"] = warnings


    return enhanced_inventory