from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

model = SentenceTransformer('all-MiniLM-L6-v2')

person1_tags = ["travel", "beach", "sunset", "hiking"]
person2_tags = ["mountains", "outdoors", "adventure", "ocean"]

vec1 = np.mean(model.encode(person1_tags), axis=0)
vec2 = np.mean(model.encode(person2_tags), axis=0)

similarity = cosine_similarity([vec1], [vec2])[0][0]