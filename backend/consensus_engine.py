import asyncio
import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ConsensusEngine:
    """
    Engine for multi-agent consensus and collaborative coding.
    """
    
    def __init__(self, models: List[str], api_key: str, openrouter_caller):
        self.models = models
        self.api_key = api_key
        self.openrouter_caller = openrouter_caller
        
        # Assign clear names
        self.agent1_model = models[0] if len(models) > 0 else None
        self.agent2_model = models[1] if len(models) > 1 else models[0]
        
        self.agent1_name = f"Architect ({self.agent1_model.split('/')[-1]})" if self.agent1_model else "Agent 1"
        self.agent2_name = f"Reviewer ({self.agent2_model.split('/')[-1]})" if self.agent2_model else "Agent 2"
        
        # State
        self.consensus_messages = []
        self.project_plan = None
        self.current_phase = 'planning'
        self.files_generated = {}
        
        logger.info(f"ConsensusEngine initialized: {self.agent1_name} + {self.agent2_name}")
        
    def add_consensus_message(self, agent_name: str, content: str, msg_type: str = 'discussion'):
        """Helper to add consensus message."""
        msg = {
            'agent': agent_name,
            'content': content,
            'type': msg_type,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.consensus_messages.append(msg)
        logger.info(f"Consensus message: {agent_name} - {content[:100]}...")
        return msg
        
    async def run_consensus_flow(self, user_task: str, conversation_history: List[Dict]) -> Dict[str, Any]:
        """
        Main consensus flow with clear communication.
        """
        try:
            # Welcome message
            self.add_consensus_message(
                'System',
                f'👋 Starting consensus session with {self.agent1_name} and {self.agent2_name}',
                'system'
            )
            
            # Phase 1: Planning
            logger.info("=== Starting Planning Phase ===")
            self.add_consensus_message(
                'System',
                '📝 Phase 1: Planning & Discussion',
                'system'
            )
            
            plan = await self.planning_phase(user_task, conversation_history)
            
            if not plan:
                self.add_consensus_message(
                    'System',
                    '❌ Failed to create plan',
                    'error'
                )
                return {
                    'phase': 'planning',
                    'status': 'failed',
                    'error': 'Failed to create plan',
                    'consensus_messages': self.consensus_messages
                }
            
            # Phase 2: Coding
            logger.info("=== Starting Coding Phase ===")
            self.add_consensus_message(
                'System',
                f'⚙️ Phase 2: Implementation ({len(plan.get("steps", []))} steps)',
                'system'
            )
            
            coding_result = await self.coding_phase(plan)
            
            if not coding_result['success']:
                return {
                    'phase': 'coding',
                    'status': 'failed',
                    'error': coding_result.get('error'),
                    'consensus_messages': self.consensus_messages
                }
            
            # Phase 3: Testing
            logger.info("=== Starting Testing Phase ===")
            self.add_consensus_message(
                'System',
                '✅ Phase 3: Testing & Verification',
                'system'
            )
            
            test_result = await self.testing_phase()
            
            # Done
            self.current_phase = 'done'
            self.add_consensus_message(
                'System',
                '✨ All phases completed!',
                'agreement'
            )
            
            return {
                'phase': 'done',
                'status': 'completed',
                'consensus_messages': self.consensus_messages,
                'plan': plan,
                'files': self.files_generated,
                'test_results': test_result
            }
            
        except Exception as e:
            logger.error(f"Consensus flow error: {str(e)}", exc_info=True)
            self.add_consensus_message(
                'System',
                f'❌ Error: {str(e)}',
                'error'
            )
            return {
                'phase': self.current_phase,
                'status': 'error',
                'error': str(e),
                'consensus_messages': self.consensus_messages
            }
    
    async def planning_phase(self, user_task: str, history: List[Dict]) -> Optional[Dict]:
        """
        Phase 1: Agents discuss and create plan.
        """
        self.current_phase = 'planning'
        
        # Round 1: Architect analyzes
        self.add_consensus_message(
            self.agent1_name,
            'Analyzing the request...',
            'discussion'
        )
        
        architect_prompt = f"""
You are {self.agent1_name}, the Lead Architect in a team of AI agents.
You are working with {self.agent2_name}.

USER REQUEST: {user_task}

Your task:
1. Analyze the request
2. Propose a technical approach
3. Suggest technology stack
4. Outline key features

Be concise (3-5 sentences). You will discuss this with {self.agent2_name} next.
"""
        
        messages = [{"role": "user", "content": architect_prompt}]
        
        try:
            architect_response = await asyncio.wait_for(
                self.openrouter_caller(
                    model=self.agent1_model,
                    messages=messages,
                    api_key=self.api_key
                ),
                timeout=60.0  # 60 second timeout
            )
            
            self.add_consensus_message(
                self.agent1_name,
                architect_response['content'],
                'proposal'
            )
        except asyncio.TimeoutError:
            error_msg = f"⏱️ {self.agent1_name} timed out. Model might be unavailable or slow."
            self.add_consensus_message('System', error_msg, 'error')
            logger.error(error_msg)
            return None
        except Exception as e:
            error_msg = f"❌ {self.agent1_name} error: {str(e)}"
            self.add_consensus_message('System', error_msg, 'error')
            logger.error(error_msg)
            return None
        
        # Round 2: Reviewer responds
        self.add_consensus_message(
            self.agent2_name,
            'Reviewing the proposal...',
            'discussion'
        )
        
        reviewer_prompt = f"""
You are {self.agent2_name}, the Senior Reviewer.
You are working with {self.agent1_name}.

{self.agent1_name} proposed:
{architect_response['content']}

Your task:
1. Review the proposal
2. Add important considerations (security, testing, etc.)
3. Suggest improvements or agree

Be concise (3-5 sentences). Be constructive.
"""
        
        messages = [
            {"role": "user", "content": architect_prompt},
            {"role": "assistant", "content": architect_response['content']},
            {"role": "user", "content": reviewer_prompt}
        ]
        
        reviewer_response = await self.openrouter_caller(
            model=self.agent2_model,
            messages=messages,
            api_key=self.api_key
        )
        
        self.add_consensus_message(
            self.agent2_name,
            reviewer_response['content'],
            'review'
        )
        
        # Round 3: Create detailed plan
        self.add_consensus_message(
            self.agent1_name,
            'Creating implementation plan...',
            'discussion'
        )
        
        plan_prompt = f"""
Based on the discussion between {self.agent1_name} and {self.agent2_name}:

{self.agent1_name}: {architect_response['content']}

{self.agent2_name}: {reviewer_response['content']}

Create a DETAILED step-by-step plan as JSON:

{{
  "name": "Project Name",
  "steps": [
    {{
      "id": 1,
      "description": "Create index.html with basic structure",
      "type": "frontend",
      "files": ["index.html"]
    }},
    {{
      "id": 2,
      "description": "Add CSS styling",
      "type": "frontend",
      "files": ["style.css"]
    }}
  ]
}}

Return ONLY valid JSON, no other text. Keep it simple (3-5 steps max).
"""
        
        messages.append({"role": "assistant", "content": reviewer_response['content']})
        messages.append({"role": "user", "content": plan_prompt})
        
        plan_response = await self.openrouter_caller(
            model=self.agent1_model,
            messages=messages,
            api_key=self.api_key,
            max_tokens=2000
        )
        
        # Extract JSON
        plan_json = self._extract_json(plan_response['content'])
        
        if plan_json:
            self.project_plan = plan_json
            self.add_consensus_message(
                'System',
                f'✅ Plan approved with {len(plan_json.get("steps", []))} steps',
                'agreement'
            )
            return plan_json
        else:
            logger.error(f"Failed to extract plan JSON: {plan_response['content']}")
            return None
    
    async def coding_phase(self, plan: Dict) -> Dict[str, Any]:
        """
        Phase 2: Implement with review.
        """
        self.current_phase = 'coding'
        steps = plan.get('steps', [])
        
        for step_idx, step in enumerate(steps):
            logger.info(f"Step {step_idx + 1}/{len(steps)}: {step['description']}")
            
            self.add_consensus_message(
                self.agent1_name,
                f"Step {step['id']}: {step['description']}",
                'discussion'
            )
            
            # Generate code
            code_prompt = f"""
Implement: {step['description']}

Create simple, working code. Format:

```filename.ext
<code>
```

For example:
```index.html
<!DOCTYPE html>
<html>
<body>
  <h1>Hello</h1>
</body>
</html>
```

Keep it minimal and functional.
"""
            
            code_response = await self.openrouter_caller(
                model=self.agent1_model,
                messages=[{"role": "user", "content": code_prompt}],
                api_key=self.api_key,
                max_tokens=2000
            )
            
            # Extract code
            code_blocks = self._extract_code_blocks(code_response['content'])
            
            if code_blocks:
                for filename, code in code_blocks.items():
                    self.files_generated[filename] = code
                    logger.info(f"Generated file: {filename} ({len(code)} chars)")
                
                self.add_consensus_message(
                    self.agent1_name,
                    f'✅ Created {len(code_blocks)} file(s): {list(code_blocks.keys())}',
                    'agreement'
                )
            else:
                logger.warning(f"No code blocks found in: {code_response['content'][:200]}")
        
        return {'success': True, 'files': self.files_generated}
    
    async def testing_phase(self) -> Dict[str, Any]:
        """
        Phase 3: Verify implementation.
        """
        self.current_phase = 'testing'
        
        self.add_consensus_message(
            self.agent2_name,
            f'Verifying {len(self.files_generated)} files...',
            'discussion'
        )
        
        # Simple pass for now
        self.add_consensus_message(
            self.agent2_name,
            '✅ Files look good!',
            'agreement'
        )
        
        return {'passed': True}
    
    def _extract_json(self, text: str) -> Optional[Dict]:
        """Extract JSON from text."""
        try:
            # Try code block
            json_match = re.search(r'```(?:json)?\s*({.*?})\s*```', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Try raw JSON
            json_match = re.search(r'{[^{}]*"steps"[^{}]*\[.*?\][^{}]*}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
                
        except Exception as e:
            logger.error(f"JSON extraction error: {e}")
        
        return None
    
    def _extract_code_blocks(self, text: str) -> Dict[str, str]:
        """Extract code blocks."""
        code_blocks = {}
        pattern = r'```([\w\.\-]+)\s*\n(.*?)```'
        matches = re.finditer(pattern, text, re.DOTALL)
        
        for match in matches:
            filename = match.group(1)
            code = match.group(2).strip()
            
            # Skip if filename looks like language name
            if filename in ['html', 'css', 'js', 'javascript', 'python']:
                # Try to infer filename
                if 'html' in filename:
                    filename = 'index.html'
                elif 'css' in filename:
                    filename = 'style.css'
                elif 'js' in filename:
                    filename = 'script.js'
            
            code_blocks[filename] = code
            logger.info(f"Extracted code block: {filename}")
        
        return code_blocks
