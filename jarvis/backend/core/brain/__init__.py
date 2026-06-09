"""
JARVIS Neural Brain - Core cognitive architecture.

Inspired by biological brain regions, each module represents a 
specialized cognitive function:

- PrefrontalCortex: Executive reasoning, strategic planning
- Hippocampus: Long-term memory, knowledge retrieval
- TemporalCortex: Language processing, communication
- VisualCortex: Vision, OCR, image analysis
- ParietalCortex: Analytics, data processing
- Amygdala: Risk assessment, threat detection
- BasalGanglia: Task execution, workflow automation
- MotorCortex: Tool usage, API execution
- CorpusCallosum: Inter-agent communication
"""

from .regions import (
    BrainRegion,
    PrefrontalCortex,
    Hippocampus,
    TemporalCortex,
    VisualCortex,
    ParietalCortex,
    Amygdala,
    BasalGanglia,
    MotorCortex,
    CorpusCallosum,
)
from .neural_graph import NeuralGraph, NeuralSignal, NeuralPulse
from .brain_controller import BrainController

__all__ = [
    "BrainRegion",
    "PrefrontalCortex",
    "Hippocampus",
    "TemporalCortex",
    "VisualCortex",
    "ParietalCortex",
    "Amygdala",
    "BasalGanglia",
    "MotorCortex",
    "CorpusCallosum",
    "NeuralGraph",
    "NeuralSignal",
    "NeuralPulse",
    "BrainController",
]
