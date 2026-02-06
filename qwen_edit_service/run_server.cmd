@echo off
set QWEN_MODEL_ID=Qwen/Qwen-Image-Edit-2509
set QWEN_PRELOAD=1
set QWEN_HEIGHT=1536
set QWEN_WIDTH=1536
set QWEN_STEPS=50
set QWEN_TRUE_CFG=4.0
set QWEN_DTYPE=bf16
set QWEN_MODE=best_take
set QWEN_CORS=http://localhost:3000,http://127.0.0.1:3000
set QWEN_LOW_CPU_MEM=1
set QWEN_DEVICE_MAP=auto
set QWEN_OFFLOAD_DIR=%~dp0offload
REM Optional prompt rewriter (OpenAI-compatible endpoint)
REM set QWEN_REWRITE_PROMPT=1
REM set QWEN_REWRITER_API_BASE=http://127.0.0.1:11434
REM set QWEN_REWRITER_MODEL=qwen2.5:7b-instruct
REM set QWEN_REWRITER_API_KEY=your_key_here

"%~dp0\.venv\Scripts\python.exe" "%~dp0\server.py"
