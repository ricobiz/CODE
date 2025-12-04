import asyncio
import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ConsensusEngine:
    """
    Simplified engine for multi-agent collaborative coding.
    Two agents discuss briefly then generate code together.
    """
    
    def __init__(self, models: List[str], api_key: str, openrouter_caller):
        self.models = models
        self.api_key = api_key
        self.openrouter_caller = openrouter_caller
        
        # Assign models
        self.agent1_model = models[0] if len(models) > 0 else None
        self.agent2_model = models[1] if len(models) > 1 else models[0]
        
        # Short names
        self.agent1_name = self._get_short_name(self.agent1_model, "Agent 1")
        self.agent2_name = self._get_short_name(self.agent2_model, "Agent 2")
        
        # State
        self.consensus_messages = []
        self.current_phase = 'starting'
        self.files_generated = {}
        self.project_plan = None
        
        logger.info(f"ConsensusEngine initialized: {self.agent1_name} + {self.agent2_name}")
    
    def _get_short_name(self, model: str, default: str) -> str:
        if not model:
            return default
        name = model.split('/')[-1]
        # Shorten common model names
        short_names = {
            'claude-3.5-sonnet': 'Claude Sonnet',
            'claude-3-haiku': 'Claude Haiku',
            'gpt-4o': 'GPT-4o',
            'gpt-4o-mini': 'GPT-4o Mini',
            'gpt-4-turbo': 'GPT-4 Turbo',
        }
        return short_names.get(name, name[:20])
        
    def add_message(self, agent: str, content: str, msg_type: str = 'discussion'):
        """Add a message to consensus log."""
        msg = {
            'agent': agent,
            'content': content,
            'type': msg_type,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.consensus_messages.append(msg)
        logger.info(f"[{agent}] {content[:80]}...")
        return msg
        
    async def run_consensus_flow(self, user_task: str, conversation_history: List[Dict]) -> Dict[str, Any]:
        """
        Simplified consensus flow:
        1. Agent 1 proposes solution
        2. Agent 2 reviews and improves
        3. Final code is generated
        """
        try:
            self.current_phase = 'discussing'
            
            # System message
            self.add_message(
                'System',
                f'🚀 {self.agent1_name} and {self.agent2_name} are collaborating on your request.',
                'system'
            )
            
            # === STEP 1: Agent 1 proposes solution ===
            self.add_message('System', '💭 Phase 1: Planning...', 'system')
            
            agent1_prompt = f"""You are {self.agent1_name}, an expert web developer.
You're collaborating with {self.agent2_name} to build what the user wants.

USER REQUEST: {user_task}

Propose a brief implementation plan (2-3 sentences max). Focus on:
- What HTML structure to use
- Key CSS styling
- JavaScript functionality needed

Be concise. Your partner will review and then you'll write the code together."""

            try:
                response1 = await asyncio.wait_for(
                    self.openrouter_caller(
                        model=self.agent1_model,
                        messages=[{"role": "user", "content": agent1_prompt}],
                        api_key=self.api_key,
                        max_tokens=500
                    ),
                    timeout=45.0
                )
                self.add_message(self.agent1_name, response1['content'], 'proposal')
            except asyncio.TimeoutError:
                self.add_message('System', f'⏱️ {self.agent1_name} timed out', 'error')
                return self._error_result('Agent 1 timed out')
            except Exception as e:
                self.add_message('System', f'❌ {self.agent1_name} error: {str(e)[:100]}', 'error')
                return self._error_result(str(e))
            
            # === STEP 2: Agent 2 reviews ===
            agent2_prompt = f"""You are {self.agent2_name}, an expert code reviewer.
{self.agent1_name} proposed this plan:

\"{response1['content']}\"

Briefly agree or suggest ONE improvement (1-2 sentences max). Then say "Let's build it!" """

            try:
                response2 = await asyncio.wait_for(
                    self.openrouter_caller(
                        model=self.agent2_model,
                        messages=[{"role": "user", "content": agent2_prompt}],
                        api_key=self.api_key,
                        max_tokens=300
                    ),
                    timeout=45.0
                )
                self.add_message(self.agent2_name, response2['content'], 'review')
            except asyncio.TimeoutError:
                self.add_message('System', f'⏱️ {self.agent2_name} timed out', 'error')
                return self._error_result('Agent 2 timed out')
            except Exception as e:
                self.add_message('System', f'❌ {self.agent2_name} error: {str(e)[:100]}', 'error')
                return self._error_result(str(e))
            
            # === STEP 3: Generate code ===
            self.current_phase = 'coding'
            self.add_message('System', '⚡ Phase 2: Generating code...', 'system')
            
            code_prompt = f"""Based on the discussion between {self.agent1_name} and {self.agent2_name}:

{self.agent1_name}: {response1['content']}
{self.agent2_name}: {response2['content']}

Now generate the COMPLETE working code for: {user_task}

IMPORTANT: Use this EXACT format for each file:
```index.html
<complete HTML code here>
```
```style.css
<complete CSS code here>
```
```script.js
<complete JavaScript code here>
```

Generate all necessary files. Make it visually appealing and fully functional."""

            try:
                code_response = await asyncio.wait_for(
                    self.openrouter_caller(
                        model=self.agent1_model,  # Use first model for code gen
                        messages=[{"role": "user", "content": code_prompt}],
                        api_key=self.api_key,
                        max_tokens=4000
                    ),
                    timeout=90.0
                )
                
                # Extract code blocks
                self.files_generated = self._extract_code_blocks(code_response['content'])
                
                if self.files_generated:
                    files_list = list(self.files_generated.keys())
                    self.add_message(
                        self.agent1_name,
                        f'✅ Created {len(files_list)} file(s): {files_list}',
                        'code'
                    )
                else:
                    # If no code blocks found, try to use the response as-is
                    self.add_message(
                        self.agent1_name,
                        code_response['content'][:500] + '...',
                        'code'
                    )
                    
            except asyncio.TimeoutError:
                self.add_message('System', '⏱️ Code generation timed out', 'error')
                return self._error_result('Code generation timed out')
            except Exception as e:
                self.add_message('System', f'❌ Code generation error: {str(e)[:100]}', 'error')
                return self._error_result(str(e))
            
            # === DONE ===
            self.current_phase = 'done'
            self.add_message('System', '✨ Collaboration complete!', 'agreement')
            
            return {
                'phase': 'done',
                'status': 'completed',
                'consensus_messages': self.consensus_messages,
                'files': self.files_generated,
                'plan': {'name': user_task, 'steps': []}
            }
            
        except Exception as e:
            logger.error(f"Consensus flow error: {str(e)}", exc_info=True)
            self.add_message('System', f'❌ Error: {str(e)}', 'error')
            return self._error_result(str(e))
    
    def _error_result(self, error: str) -> Dict[str, Any]:
        return {
            'phase': self.current_phase,
            'status': 'failed',
            'error': error,
            'consensus_messages': self.consensus_messages,
            'files': self.files_generated
        }
    
    def _extract_code_blocks(self, text: str) -> Dict[str, str]:
        """Extract code blocks with filenames."""
        code_blocks = {}
        
        # Pattern: ```filename.ext or ```language
        pattern = r'```([\w\.\-]+)\s*\n([\s\S]*?)```'
        matches = re.finditer(pattern, text, re.MULTILINE)
        
        for match in matches:
            identifier = match.group(1).strip()
            code = match.group(2).strip()
            
            # Map language names to filenames
            filename_map = {
                'html': 'index.html',
                'htm': 'index.html',
                'css': 'style.css',
                'style': 'style.css',
                'js': 'script.js',
                'javascript': 'script.js',
            }
            
            # Use identifier as filename or map it
            if '.' in identifier:
                filename = identifier
            else:
                filename = filename_map.get(identifier.lower(), f'{identifier}.txt')
            
            code_blocks[filename] = code
            logger.info(f"Extracted: {filename} ({len(code)} chars)")
        
        return code_blocks
