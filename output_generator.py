import json
from datetime import datetime



def create_final_output(
        yolo_input,
        llm_output
):


    latest = yolo_input[-1]


    final_json = {


        "created_at_utc":
        latest["created_at_utc"],


        "completed_at_utc":
        latest["completed_at_utc"],



        "media":
        latest["media"],



        "user_preferences":
        latest["user_preferences"],



        "inventory_summary":
        latest["inventory_summary"],



        "id":
        latest["id"],



        "llm_result":
        llm_output,



        "llm_generated_time":
        datetime.utcnow().isoformat()+"Z"


    }


    return final_json





def save_output(data):


    with open(
        "final_response.json",
        "w"
    ) as f:


        json.dump(
            data,
            f,
            indent=4
        )