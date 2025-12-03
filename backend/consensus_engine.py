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
    Implements: Planning → Coding → Testing → Done phases.
    """
    
    def __init__(self, models: List[str], api_key: str, openrouter_caller):
        self.models = models
        self.api_key = api_key
        self.openrouter_caller = openrouter_caller
        
        # Assign roles
        self.architect = models[0] if len(models) > 0 else None
        self.reviewer = models[1] if len(models) > 1 else models[0]
        
        # State
        self.consensus_messages = []
        self.project_plan = None
        self.current_phase = 'planning'
        self.files_generated = {}
        
    async def run_consensus_flow(self, user_task: str, conversation_history: List[Dict]) -> Dict[str, Any]:
        """
        Main consensus flow:
        1. Planning Phase - agents discuss and create plan
        2. Coding Phase - implement step by step with review
        3. Testing Phase - verify everything works
        4. Done - both agents confirm completion
        """
        try:
            # Phase 1: Planning & Consensus
            logger.info("Starting Planning Phase...")
            plan = await self.planning_phase(user_task, conversation_history)
            
            if not plan:
                return {
                    'phase': 'planning',
                    'status': 'failed',
                    'error': 'Failed to create plan'
                }
            
            # Phase 2: Coding with review
            logger.info("Starting Coding Phase...")
            coding_result = await self.coding_phase(plan)
            
            if not coding_result['success']:
                return {
                    'phase': 'coding',
                    'status': 'failed',
                    'error': coding_result.get('error')
                }
            
            # Phase 3: Testing
            logger.info("Starting Testing Phase...")
            test_result = await self.testing_phase()
            
            # Phase 4: Done
            self.current_phase = 'done'
            
            return {
                'phase': 'done',
                'status': 'completed',
                'consensus_messages': self.consensus_messages,
                'plan': plan,
                'files': self.files_generated,
                'test_results': test_result
            }
            
        except Exception as e:
            logger.error(f"Consensus flow error: {str(e)}")
            return {
                'phase': self.current_phase,
                'status': 'error',
                'error': str(e),
                'consensus_messages': self.consensus_messages
            }
    
    async def planning_phase(self, user_task: str, history: List[Dict]) -> Optional[Dict]:
        """
        Phase 1: Agents discuss the task and create a detailed plan.
        """
        self.current_phase = 'planning'
        
        # Round 1: Architect proposes approach
        architect_prompt = f"""
You are the Lead Architect in a team of AI agents building software together.

User Request: {user_task}

Your role: Analyze the request and propose a technical approach.

Provide:
1. Technology stack recommendation
2. High-level architecture
3. Key features to implement
4. Estimated complexity

Be concise but thorough. Format your response for discussion with your team.
"""
        
        messages = history + [{"role": "user", "content": architect_prompt}]
        architect_response = await self.openrouter_caller(
            model=self.architect,
            messages=messages,
            api_key=self.api_key
        )
        
        self.consensus_messages.append({
            'agent': f'Architect ({self.architect.split("/")[-1]})',
            'content': architect_response['content'],
            'type': 'proposal',
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # Round 2: Reviewer responds and adds suggestions
        reviewer_prompt = f"""
You are the Senior Reviewer in a team of AI agents.

The Architect proposed:
{architect_response['content']}

Your role: Review the proposal and:
1. Agree or suggest improvements
2. Add important considerations (security, performance, testing)
3. Help finalize the approach

Be constructive and collaborative.
"""
        
        messages.append({"role": "assistant", "content": architect_response['content']})
        messages.append({"role": "user", "content": reviewer_prompt})
        
        reviewer_response = await self.openrouter_caller(
            model=self.reviewer,
            messages=messages,
            api_key=self.api_key
        )
        
        self.consensus_messages.append({
            'agent': f'Reviewer ({self.reviewer.split("/")[-1]})',
            'content': reviewer_response['content'],
            'type': 'review',
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # Round 3: Create detailed step-by-step plan
        plan_prompt = f"""
Based on the discussion:

Architect: {architect_response['content']}

Reviewer: {reviewer_response['content']}

Now create a DETAILED step-by-step implementation plan.

Format as JSON:
{{
  "name": "Project Name",
  "steps": [
    {{
      "id": 1,
      "description": "Step description",
      "type": "backend|frontend|integration|testing",
      "files": ["file1.py", "file2.js"],
      "dependencies": []
    }}
  ]
}}

Each step should be atomic and testable. Return ONLY the JSON, no other text.
"""
        
        messages.append({"role": "assistant", "content": reviewer_response['content']})
        messages.append({"role": "user", "content": plan_prompt})
        
        plan_response = await self.openrouter_caller(
            model=self.architect,
            messages=messages,
            api_key=self.api_key
        )
        
        # Extract JSON from response
        plan_json = self._extract_json(plan_response['content'])
        
        if plan_json:
            self.project_plan = plan_json
            self.consensus_messages.append({
                'agent': 'System',
                'content': f"✓ Plan created with {len(plan_json.get('steps', []))} steps",
                'type': 'agreement',
                'timestamp': datetime.utcnow().isoformat()
            })
            return plan_json
        
        return None
    
    async def coding_phase(self, plan: Dict) -> Dict[str, Any]:
        """
        Phase 2: Implement each step with review cycle.
        """
        self.current_phase = 'coding'
        steps = plan.get('steps', [])
        
        for step_idx, step in enumerate(steps):
            logger.info(f"Implementing step {step_idx + 1}/{len(steps)}")
            
            # Code generation
            code_prompt = f"""
Implement step {step['id']}: {step['description']}

Context: {json.dumps(step, indent=2)}

Files to create/modify: {step.get('files', [])}

Provide the complete code for each file. Format:

```filename.ext
<code here>
```

Be thorough and follow best practices.
"""
            
            code_response = await self.openrouter_caller(
                model=self.architect,
                messages=[{"role": "user", "content": code_prompt}],
                api_key=self.api_key
            )
            
            # Extract code blocks
            code_blocks = self._extract_code_blocks(code_response['content'])
            
            # Review cycle
            review_prompt = f"""
Review the code for step {step['id']}: {step['description']}

Code:
{code_response['content']}

Check for:
1. Correctness
2. Best practices
3. Potential bugs
4. Security issues

Respond with:
- APPROVED: if code is good
- NEEDS_CHANGES: <specific issues>
"""
            
            review_response = await self.openrouter_caller(
                model=self.reviewer,
                messages=[{"role": "user", "content": review_prompt}],
                api_key=self.api_key
            )
            
            review_content = review_response['content'].upper()
            
            if 'APPROVED' in review_content:
                # Apply code
                for filename, code in code_blocks.items():
                    self.files_generated[filename] = code
                
                self.consensus_messages.append({
                    'agent': 'System',
                    'content': f"✓ Step {step['id']} completed and approved",
                    'type': 'agreement',
                    'timestamp': datetime.utcnow().isoformat()
                })
            else:
                # Would need iteration here - for now, log and continue
                logger.warning(f"Step {step['id']} needs changes: {review_response['content']}")
                self.consensus_messages.append({
                    'agent': f'Reviewer ({self.reviewer.split("/")[-1]})',
                    'content': f"⚠ Step {step['id']} needs revision",
                    'type': 'disagreement',
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        return {'success': True, 'files': self.files_generated}
    
    async def testing_phase(self) -> Dict[str, Any]:
        """
        Phase 3: Both agents verify the implementation works.
        """
        self.current_phase = 'testing'
        
        # Simple verification for now
        test_prompt = f"""
Verify that the implementation is complete and correct.

Generated files: {list(self.files_generated.keys())}

Check:
1. All required files present
2. Code follows the plan
3. No obvious errors

Respond: PASS or FAIL with reasons.
"""
        
        # Both agents verify
        agent1_test = await self.openrouter_caller(
            model=self.architect,
            messages=[{"role": "user", "content": test_prompt}],
            api_key=self.api_key
        )
        
        agent2_test = await self.openrouter_caller(
            model=self.reviewer,
            messages=[{"role": "user", "content": test_prompt}],
            api_key=self.api_key
        )
        
        both_pass = 'PASS' in agent1_test['content'].upper() and 'PASS' in agent2_test['content'].upper()
        
        self.consensus_messages.append({
            'agent': 'System',
            'content': f"{'✓ All tests passed!' if both_pass else '⚠ Tests need attention'}",
            'type': 'agreement' if both_pass else 'disagreement',
            'timestamp': datetime.utcnow().isoformat()
        })
        
        return {
            'passed': both_pass,
            'agent1': agent1_test['content'],
            'agent2': agent2_test['content']
        }
    
    def _extract_json(self, text: str) -> Optional[Dict]:
        """Extract JSON from text."""
        try:
            # Try to find JSON in code blocks
            json_match = re.search(r'```(?:json)?\s*({.*?})\s*```', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Try to find raw JSON
            json_match = re.search(r'{.*}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
        except Exception as e:
            logger.error(f"JSON extraction error: {e}")
        
        return None
    
    def _extract_code_blocks(self, text: str) -> Dict[str, str]:
        """Extract code blocks from markdown."""
        code_blocks = {}
        pattern = r'```([\w\.]+)\s*\n(.*?)```'
        matches = re.finditer(pattern, text, re.DOTALL)
        
        for match in matches:
            filename = match.group(1)
            code = match.group(2).strip()
            code_blocks[filename] = code
        
        return code_blocks
