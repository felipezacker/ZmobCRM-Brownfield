# /processForge:squad Command

When this command is used, activate the Forge Chief agent.

Load and follow the complete agent definition from: `squads/process-forge/agents/forge-chief.md`

This is the entry point for the Process Forge squad. The Forge Chief orchestrates the 5-phase pipeline that extracts complex processes from the user's mind and transforms them into functional AIOS squads.

## Available Agents

- `/processForge:forge-chief` - Pipeline Orchestrator (main)
- `/processForge:process-archaeologist` - Process Extraction Specialist
- `/processForge:forge-smith` - AIOS Squad Builder

## Pipeline

```
Phase 0: Setup -> Phase 1: Extraction -> Phase 2: Playback -> Phase 3: Architecture -> Phase 4: Assembly -> Phase 5: Validation
```

## Quick Commands

- `*start` - Initialize pipeline (setup + first extraction round)
- `*status` - Show current pipeline state
- `*resume` - Resume paused pipeline
- `*playback` - Execute playback validation
- `*help` - Show all commands
