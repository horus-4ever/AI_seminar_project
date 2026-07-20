class PredictionResult:
    """
    This class represents a prediction result from inference.
    """

    def __init__(self):
        self.results = {}

    def to_json(self):
        """
        Return the result as a json representation.
        """
        as_list = list(self.results.values())
        return {
            "inventory_summary": as_list
        }
    
    @staticmethod
    def default_field(name="", count=0, confidence=0.0):
        """
        Helper to get a default field.
        """
        return {
            "ingredient": name,
            "detected_count": count,
            "average_confidence": confidence
        }
