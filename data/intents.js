export default [
  {
    "id": "query_card_data",
    "name": "Query Card Data",
    "description": "Ask any question about cards - balances, APR, due dates, best card, etc.",
    "patterns": [
      "what cards",
      "show cards",
      "my cards",
      "which card",
      "best card",
      "lowest",
      "highest",
      "due date",
      "when",
      "balance",
      "interest",
      "apr",
      "limit",
      "available",
      "rewards",
      "how much"
    ],
    "keywords": ["card", "cards", "balance", "apr", "interest", "due", "date", "limit", "best", "lowest", "highest", "which", "what", "when", "how", "show", "list", "rewards", "points", "cashback"],
    "requiredEntities": [],
    "action": "query_card_data",
    "confidence_threshold": 0.5
  },
  {
    "id": "add_card",
    "name": "Add Card",
    "description": "Navigate to add a new card",
    "patterns": [
      "add card",
      "new card",
      "add a card",
      "create card",
      "add credit card"
    ],
    "keywords": ["add", "new", "create"],
    "requiredEntities": [],
    "action": "navigate_add_card",
    "confidence_threshold": 0.8
  },
  {
    "id": "remove_card",
    "name": "Remove Card",
    "description": "Remove a card from wallet",
    "patterns": [
      "remove card",
      "delete card",
      "remove from wallet",
      "delete this card"
    ],
    "keywords": ["remove", "delete"],
    "requiredEntities": [],
    "action": "remove_card",
    "confidence_threshold": 0.8
  },
  {
    "id": "navigate_screen",
    "name": "Navigate to Screen",
    "description": "Navigate to a specific screen",
    "patterns": [
      "take me to",
      "go to",
      "navigate to",
      "open"
    ],
    "keywords": ["take", "go", "navigate", "open"],
    "requiredEntities": [],
    "action": "navigate",
    "confidence_threshold": 0.7
  },
  {
    "id": "help",
    "name": "Help",
    "description": "Show what the assistant can do",
    "patterns": [
      "help",
      "what can you do",
      "how to use",
      "commands",
      "features"
    ],
    "keywords": ["help", "commands", "features", "can you do"],
    "requiredEntities": [],
    "action": "show_help",
    "confidence_threshold": 0.8
  },
  {
    "id": "split_payment",
    "name": "Split Payment",
    "description": "Split a budget amount across all cards optimally",
    "patterns": [
      "split payment",
      "split between cards",
      "distribute payment",
      "allocate budget",
      "divide payment"
    ],
    "keywords": ["split", "distribute", "divide", "allocate", "between", "across"],
    "requiredEntities": ["amount"],
    "action": "split_payment",
    "confidence_threshold": 0.7
  }
]
