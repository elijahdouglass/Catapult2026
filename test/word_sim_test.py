import sys
import json
import numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')


def compute_vector(tags: list[str]) -> list[float]:
    """Compute mean embedding vector for a list of tags."""
    if not tags:
        raise ValueError("Tags list cannot be empty")
    vec = np.mean(model.encode(tags), axis=0)
    return vec.tolist()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} '<json_tag_array>'", file=sys.stderr)
        sys.exit(1)

    tags = json.loads(sys.argv[1])
    vector = compute_vector(tags)
    print(json.dumps(vector))
