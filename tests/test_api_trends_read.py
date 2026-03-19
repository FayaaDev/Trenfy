import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def test_cursor_codec_round_trip() -> None:
    from api.contracts import decode_cursor, encode_cursor

    cursor = encode_cursor(offset=150, sort="-published_date")
    decoded = decode_cursor(cursor)

    assert decoded == {"offset": 150, "sort": "-published_date"}


def test_limit_validator_defaults_and_caps() -> None:
    from api.contracts import DEFAULT_LIMIT, MAX_LIMIT, normalize_limit

    assert normalize_limit(None) == DEFAULT_LIMIT
    assert normalize_limit(MAX_LIMIT + 1) == MAX_LIMIT


def test_invalid_cursor_path_uses_invalid_cursor_error() -> None:
    from api.contracts import decode_cursor

    try:
        decode_cursor("not-base64")
    except ValueError as error:
        assert str(error) == "invalid_cursor"
    else:
        raise AssertionError("expected invalid_cursor error")


if __name__ == "__main__":
    test_cursor_codec_round_trip()
    test_limit_validator_defaults_and_caps()
    test_invalid_cursor_path_uses_invalid_cursor_error()
    print("test_api_trends_read.py: ok")
