#!/usr/bin/env bash
set -e

echo "=== BANDIT SAST ==="
bandit -r . -c pyproject.toml --exclude .venv,frontend,node_modules

echo ""
echo "=== PIP AUDIT ==="
pip-audit

echo ""
echo "=== PYTEST SUITE ==="
pytest tests/ -v

echo ""
echo "All checks passed."
