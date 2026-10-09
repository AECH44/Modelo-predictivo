"""Database access layer for ml-service."""
from .connection import execute_query, fetch_one, fetch_all

__all__ = ['execute_query', 'fetch_one', 'fetch_all']
