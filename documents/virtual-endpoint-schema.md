# Virtual Endpoint Schema

Virtual Endpoints are the output layer of a Data Space. They aggregate data from multiple source API endpoints into a single, LLM-ready payload with configurable aggregation strategies, output mappings, and calculated fields.

## Database Table: `ng_virtual_endpoints`

| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `data_space_id` | `uuid` | — | FK to `ng_data_spaces(id)`, CASCADE delete |
| `path` | `varchar(500)` | — | Endpoint path (e.g., `/customers-orders`) |
| `method` | `varchar(10)` | `'GET'` | HTTP method |
| `description` | `text` | — | What this endpoint provides |
| `response_schema` | `jsonb` | — | Expected response JSON schema |
| `cache_ttl` | `integer` | `0` | Cache duration in seconds (0 = no cache) |
| `aggregation_strategy` | `varchar(50)` | — | `merge`, `join`, or `aggregate` |
| `aggregation_config` | `jsonb` | — | Detailed aggregation rules (join fields, mappings) |
| `max_response_time_ms` | `integer` | `30000` | Timeout for execution |
| `parallel_execution` | `boolean` | `true` | Fetch sources concurrently |
| `report_prompt` | `text` | — | Custom prompt overriding space-level default |
| `output_mapping` | `jsonb` | — | Custom output field name mapping |
| `calculated_fields` | `jsonb` | — | Calculated field definitions with formulas |
| `prespace_snapshot` | `text` | — | Plain-text data snapshot (<=8k chars) for v0 prompts |
| `prespace_snapshot_generated_at` | `timestamptz` | — | When the snapshot was last generated |
| `created_at` | `timestamptz` | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `now()` | Last update timestamp |

**Unique constraint:** `(data_space_id, path, method)`

**Indexes:**
- `idx_ng_virtual_endpoints_space` on `data_space_id`
- `idx_ng_virtual_endpoints_path` on `path`

## Aggregation Strategies

| Strategy | Behavior |
|---|---|
| `merge` | Union all records from each source into a single collection |
| `join` | SQL-like join on matching keys across sources |
| `aggregate` | Summarize, count, or reduce data across sources |

### Aggregation Config

```json
{
  "field_mappings": { "source_field": "output_field" },
  "join_fields": { "left_endpoint.id": "right_endpoint.customer_id" },
  "output_mapping": { "internal_name": "display_name" }
}
```

## Output Mapping

Rename fields in the response:

```json
{
  "customer_name": "name",
  "customer_email": "email",
  "order_total": "total"
}
```

## Calculated Fields

Computed values derived from source data:

```json
[
  {
    "id": "cf_1",
    "name": "full_name",
    "formula": "${first_name} ${last_name}",
    "type": "string",
    "description": "Combined first and last name"
  },
  {
    "id": "cf_2",
    "name": "total_with_tax",
    "formula": "${subtotal} * 1.08",
    "type": "number",
    "description": "Subtotal plus 8% tax"
  }
]
```

## Backend Models

### VirtualEndpointCreate (API input)

```python
class VirtualEndpointCreate(BaseModel):
    path: str
    method: str = "GET"
    description: Optional[str] = None
    aggregation_strategy: str = "merge"
    aggregation_config: Optional[Dict[str, Any]] = None
    cache_ttl: int = 0
    parallel_execution: bool = True
    output_mapping: Optional[Dict[str, str]] = None
    calculated_fields: Optional[List[Dict[str, Any]]] = None
```

### VirtualEndpointSpec (Agent-generated)

```python
class VirtualEndpointSpec(BaseModel):
    path: str
    method: str = "GET"
    description: str
    aggregation_strategy: Literal["merge", "join", "aggregate", "custom"]
    aggregation_config: Dict[str, Any] = {}
    cache_ttl: int = 300
    parallel_execution: bool = True
    max_response_time_ms: int = 30000
    response_schema: Dict[str, Any] = {}
    error_handling: Dict[str, Any] = {}
```

## Frontend Types

### VirtualEndpoint

```typescript
interface VirtualEndpoint {
  id: string;
  data_space_id: string;
  path: string;
  method: string;
  description?: string;
  configuration: any;
  aggregation_strategy?: "merge" | "join" | "aggregate";
  aggregation_config?: Record<string, any>;
  cache_ttl?: number;
  parallel_execution?: boolean;
  output_mapping?: Record<string, string>;
  calculated_fields?: Array<Record<string, any>>;
  created_at: string;
}
```

### VirtualLink (Canvas node data)

```typescript
interface VirtualLink {
  id: string;
  name: string;
  path: string;
  method?: string;
  output_mapping?: Record<string, string> | null;
  calculated_fields?: Array<{
    id: string;
    name: string;
    formula: string;
    type: string;
    description?: string;
  }> | null;
}
```

### VirtualEndpointConfigData (Config panel)

```typescript
interface VirtualEndpointConfigData {
  path: string;
  description?: string;
  outputFields?: string[];
  calculatedFields?: Array<{
    name: string;
    formula: string;
    description?: string;
  }>;
  customOutputStructure?: string;
  enableCache?: boolean;
  cacheTime?: number;
}
```

## Execution Response JSON

When a virtual endpoint is executed via `POST /{space_id}/virtual-endpoints/{ve_id}/execute` or through the public access route, the response is an LLM-ready payload with three top-level keys.

### Full JSON Structure

```json
{
  "context": {
    "strategy": "merge",
    "space": {
      "id": "uuid-of-data-space",
      "name": "Customer Analytics",
      "base_path": "/analytics"
    },
    "endpoint": {
      "path": "/customers-orders",
      "method": "GET",
      "description": "Customer data with linked orders"
    },
    "sources": ["crm_customers", "order_system"],
    "execution_time_ms": 342,
    "record_count": 150,
    "cache_hit": false
  },
  "collections": [
    {
      "key": "crm_customers",
      "title": "Crm Customers",
      "description": "Crm Customers records compiled from /api/customers.",
      "record_count": 100,
      "schema": {
        "id": "string",
        "name": "string",
        "email": "string",
        "created_at": "string",
        "lifetime_value": "number",
        "address.city": "string",
        "address.state": "string"
      },
      "records": [
        {
          "id": "c_001",
          "name": "Acme Corp",
          "email": "contact@acme.com",
          "created_at": "2024-01-15T10:30:00Z",
          "lifetime_value": 50000,
          "address.city": "New York",
          "address.state": "NY"
        }
      ]
    },
    {
      "key": "order_system",
      "title": "Order System",
      "description": "Order System records compiled from /api/orders.",
      "record_count": 50,
      "schema": {
        "order_id": "string",
        "customer_id": "string",
        "total": "number",
        "status": "string",
        "items": "array<object>"
      },
      "records": [
        {
          "order_id": "o_001",
          "customer_id": "c_001",
          "total": 1250.00,
          "status": "completed",
          "items": [{"sku": "A1", "qty": 2}]
        }
      ]
    }
  ],
  "insights": {
    "total_collections": 2,
    "total_records": 150,
    "shared_fields": {
      "created_at": ["crm_customers", "order_system"]
    },
    "organizations_represented": 12,
    "new_york_records": 34,
    "recommended_use": "Correlate customer lifetime value with order frequency and status to identify high-value accounts with outstanding orders."
  }
}
```

### context

Execution metadata describing what ran and how.

| Field | Type | Description |
|---|---|---|
| `strategy` | `string` | Aggregation used: `merge`, `join`, `aggregate`, or `mcp_prompt` |
| `space.id` | `string` | Data space UUID |
| `space.name` | `string` | Human-readable space name |
| `space.base_path` | `string?` | URL prefix for public access |
| `endpoint.path` | `string` | Virtual endpoint path |
| `endpoint.method` | `string` | HTTP method (`GET`, `POST`) |
| `endpoint.description` | `string?` | What this endpoint provides |
| `sources` | `string[]` | Source endpoint aliases that contributed data |
| `execution_time_ms` | `number` | Total execution duration |
| `record_count` | `number` | Total records across all sources |
| `cache_hit` | `boolean` | Whether results came from cache |

### collections

Array of data groups, one per source endpoint. Records are capped at 10 per collection for token efficiency.

| Field | Type | Description |
|---|---|---|
| `key` | `string` | Slugified identifier (e.g., `crm_customers`) |
| `title` | `string` | Title-cased display name |
| `description` | `string` | Auto-generated: `"{Title} records compiled from {source_path}."` |
| `record_count` | `number` | Total records from this source (not capped) |
| `schema` | `Record<string, string>` | Inferred field types from first record (flattened with dot notation) |
| `records` | `object[]` | Sample records (max 10, nested arrays also capped) |

**Schema type inference values:**

| Type | Meaning |
|---|---|
| `"string"` | Text value |
| `"string?"` | Null value (type unknown) |
| `"number"` | Integer or float |
| `"boolean"` | True/false |
| `"object"` | Nested object |
| `"array<string>"` | Array with typed items |
| `"array<object>"` | Array of objects |

### insights

AI-generated analysis of the collected data.

| Field | Type | Description |
|---|---|---|
| `total_collections` | `number` | Number of source collections |
| `total_records` | `number` | Sum of all record counts |
| `shared_fields` | `Record<string, string[]>` | Fields appearing in multiple collections (join candidates) |
| `organizations_represented` | `number?` | Count of unique organization IDs (if present) |
| `{city}_records` | `number?` | Record count for most common city (dynamic key) |
| `recommended_use` | `string` | AI-generated sentence on how to leverage this data |

### Internal Execution Result (pre-payload)

Before the LLM-ready payload is built, `execute_virtual_endpoint()` returns this intermediate format:

```json
{
  "data": [],
  "sources": ["alias_1", "alias_2"],
  "strategy": "merge",
  "source_payloads": [
    {
      "alias": "crm_customers",
      "data": [{"id": "c_001", "name": "Acme Corp"}],
      "connection_id": "uuid-of-connection",
      "endpoint_path": "/api/customers"
    }
  ]
}
```

`build_llm_ready_payload()` transforms this into the final response by building collections from `source_payloads`, inferring schemas, capping records, and generating insights.

## Related Tables

| Table | Relationship |
|---|---|
| `ng_data_spaces` | Parent — a virtual endpoint belongs to one data space |
| `ng_data_space_endpoints` | Source endpoints that feed into the virtual endpoint |
| `ng_endpoint_relationships` | Join relationships between source endpoints |
| `ng_data_space_usage` | Usage analytics (`virtual_endpoint_id` FK, SET NULL) |
| `ng_prespace_projects` | PreSpace projects linked to a virtual endpoint (SET NULL) |
| `ng_prespace_builds` | PreSpace builds linked to a virtual endpoint (CASCADE) |

## Execution Flow

```
Data Space
  └── Source Endpoints (ng_data_space_endpoints)
        │
        ├── Fetch data from each source connection
        ├── Apply field_mappings and filter_config per source
        │
        └──▶ Virtual Endpoint
              │
              ├── Apply aggregation_strategy (merge/join/aggregate)
              ├── Apply aggregation_config (join keys, field maps)
              ├── Apply output_mapping (rename fields)
              ├── Compute calculated_fields (formulas)
              │
              └──▶ LLM-Ready Payload
                    ├── context   → execution metadata
                    ├── collections → data grouped by source
                    └── insights  → AI-generated analysis
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/data-spaces/{id}/virtual-endpoints` | List virtual endpoints for a data space |
| `POST` | `/api/v1/data-spaces/{id}/virtual-endpoints` | Create a virtual endpoint |
| `GET` | `/api/v1/data-spaces/{id}/virtual-endpoints/{ve_id}` | Get virtual endpoint details |
| `PUT` | `/api/v1/data-spaces/{id}/virtual-endpoints/{ve_id}` | Update a virtual endpoint |
| `DELETE` | `/api/v1/data-spaces/{id}/virtual-endpoints/{ve_id}` | Delete a virtual endpoint |
| `POST` | `/api/v1/data-spaces/{id}/virtual-endpoints/{ve_id}/execute` | Execute and return LLM-ready payload |
