# from elasticsearch import Elasticsearch, helpers
# from config import ES_HOST, ES_USER, ES_PASS

# def get_es_client():
#     if ES_USER and ES_PASS:
#         es = Elasticsearch([ES_HOST], basic_auth=(ES_USER, ES_PASS))
#     else:
#         es = Elasticsearch([ES_HOST])
#     return es

# def fetch_docs(es, index, query=None, size=100):
#     # query: Elasticsearch DSL dict or None (match_all)
#     if query is None:
#         query = {"query": {"match_all": {}}}
#     resp = es.search(index=index, body=query, size=size, _source=True)
#     hits = resp.get("hits", {}).get("hits", [])
#     # return list of dict: {"_id": id, "_source": source}
#     return [{"_id": h["_id"], "_source": h["_source"]} for h in hits]

# def update_doc(es, index, doc_id, update_fields: dict):
#     es.update(index=index, id=doc_id, body={"doc": update_fields})

# es_client.py — mock Elasticsearch client (dùng để test)
def get_es_client():
    print("[Mock] Elasticsearch client created")
    return None

def fetch_docs(es, index, query=None, size=100):
    print(f"[Mock] Fetch {size} docs from index={index}")
    return [
        {"_id": "1", "_source": {"content": "John Doe credit card number 4111 1111 1111 1111"}},
        {"_id": "2", "_source": {"content": "Medical report: patient has diabetes"}},
        {"_id": "3", "_source": {"content": "User email: alice@example.com"}}
    ]

def update_doc(es, index, doc_id, body):
    print(f"[Mock] Update {doc_id} in {index} with {body}")
