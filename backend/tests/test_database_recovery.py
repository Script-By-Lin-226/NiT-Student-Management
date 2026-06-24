from asyncpg.exceptions import ConnectionDoesNotExistError
from sqlalchemy.exc import DisconnectionError

from app.core.database_initialization import is_transient_db_error


def test_detects_transient_database_disconnects():
    assert is_transient_db_error(ConnectionDoesNotExistError("connection was closed"))
    assert is_transient_db_error(DisconnectionError("database disconnected"))
    assert not is_transient_db_error(ValueError("not a database error"))
