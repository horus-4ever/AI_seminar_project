import argparse
from .model import Model
from pathlib import Path


def init_parser():
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", type=str, required=True)
    parser.add_argument("--model", type=str, required=False)
    parser.add_argument("--dataset", type=str, required=False)
    parser.add_argument("--epochs", type=int, required=False, default=40)
    parser.add_argument("--size", type=int, required=False, default=640)
    return parser


def train_model(model: Model, dataset: Path, epochs: int, size: int):
    model.train(dataset, epochs, imgs=size)


if __name__ == "__main__":
    parser = init_parser()
    args = parser.parse_args()
    # now from the command line arguments build the model
    action = args.action
    base_model = Path(args.model)
    dataset = Path(args.dataset)
    epochs = args.epochs
    size = args.size
    model = Model.load_pretrained(base_model)
    # now following the action, things differ
    match action:
        case "train":
            train_model(model, dataset, epochs, size)
        case "inference":
            pass
        case _:
            pass
