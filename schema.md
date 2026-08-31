# Database Schema — Minerva Marketplace (Initial Design) 
## Overview 
This document defines the initial database schema for the Minerva Marketplace application. The schema includes two core entities:
- **Users** — marketplace participants (buyers/sellers) 
- **Items** — listings created by users

--- 
# Users Table 

## Purpose 
Represents a university student who can post items and interact with listings. 

## Table: `users` 
| Field | Type | Required | Description | 
|------|------|----------|-------------| 
| id | integer (PK) | ✅ | Unique user identifier | 
| email | string (unique) | ✅ | University email address | 
| password_hash | string | ✅ | Hashed password | 
| first_name | string | ✅ | User first name | 
| last_name | string | ✅ | User last name | 
| created_at | datetime | ✅ | Account creation timestamp | 
| updated_at | datetime | ✅ | Last update timestamp | 

## Constraints 
- Unique index on `email` 
- Password stored securely as a hash (never plaintext) 

## Future extensions 
- profile_photo_url 
- campus/location 
- is_verified 
- bio

--- 
# Items Table 

## Purpose 
Represents a marketplace listing posted by a user. 

## Table: `items` 
| Field | Type | Required | Description | 
|------|------|----------|-------------| 
| id | integer (PK) | ✅ | Unique item identifier | 
| seller_id | integer (FK → users.id) | ✅ | Listing owner | 
| title | string | ✅ | Listing title | 
| description | text | ❌ | Item description | 
| price | integer | ✅ | Price stored in cents to avoid float issues | 
| currency | string | ✅ | Currency code (default: USD) | 
| category | string | ✅ | Item category | 
| condition | string | ✅ | Item condition (New, Like New, Good, Fair) | 
| status | string | ✅ | active / reserved / sold / deleted | 
| location | string | ❌ | Campus or city | 
| created_at | datetime | ✅ | Listing creation time | 
| updated_at | datetime | ✅ | Last update time | 

## Relationships 
- One **User** → many **Items** 
- `items.seller_id` references `users.id`

# Entity Relationship Summary 
- **User (1) → (many) Items** 
- Each item belongs to exactly one user 

--- 
# Future Tables (Not in MVP) 
## Item Images 
- id 
- item_id (FK) 
- image_url 
- sort_order 

## Messaging 
- conversations (item_id, buyer_id, seller_id) 
- messages (conversation_id, sender_id, body, created_at) 

--- 

# Design Notes 
- Prices stored in cents to avoid floating-point precision issues 
- Authentication uses hashed passwords 
- Status field allows soft deletion and marking items as sold 
- Email domain restriction may be applied to ensure university-only access