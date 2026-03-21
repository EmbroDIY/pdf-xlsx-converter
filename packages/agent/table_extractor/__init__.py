"""ADK agent for extracting tables from PDF documents."""

import os

from google.adk.agents import Agent

from table_extractor.tools import extract_table_from_pdf, save_to_xlsx


def _get_model():
    provider = os.environ.get("LLM_PROVIDER", "gemini")
    if provider == "ollama":
        from google.adk.models.lite_llm import LiteLlm

        model_name = os.environ.get("OLLAMA_MODEL", "qwen3-vl:235b-cloud")
        host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
        return LiteLlm(model=f"ollama_chat/{model_name}", api_base=host)
    return os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")


root_agent = Agent(
    model=_get_model(),
    name="table_extractor",
    description="Extracts tabular data from PDF documents and saves to XLSX.",
    instruction=(
        "You extract tabular data from PDF documents.\n\n"
        "When given a PDF path and table definition (headers, markers), "
        "call extract_table_from_pdf to extract the rows, then call "
        "save_to_xlsx to write them to an XLSX file.\n\n"
        "Always call both tools in sequence. Report the number of rows extracted."
    ),
    tools=[extract_table_from_pdf, save_to_xlsx],
)
