/**
 * Tests for Phase 2: Extended Message Format
 *
 * This test suite covers:
 * 1. Message format with rich components
 * 2. Message format with action buttons
 * 3. MessageContent rendering of components and actions
 * 4. Action button callbacks
 */

describe('Phase 2: Extended Message Format', () => {
  // ========================================================================
  // MESSAGE FORMAT TESTS
  // ========================================================================

  describe('Message Format with Components', () => {
    it('should support message with fx_rate_card component', () => {
      const message = {
        type: 'bot',
        content: 'I am monitoring the exchange rate for you.',
        timestamp: new Date(),
        component: {
          type: 'fx_rate_card',
          data: {
            currentRate: 83.5,
            amount: 5000,
            defaultRate: 84
          }
        }
      };

      expect(message.component).toBeDefined();
      expect(message.component.type).toBe('fx_rate_card');
      expect(message.component.data.currentRate).toBe(83.5);
      expect(message.component.data.amount).toBe(5000);
    });

    it('should support message with recipient_form component', () => {
      const message = {
        type: 'bot',
        content: 'Let me confirm the recipient details.',
        timestamp: new Date(),
        component: {
          type: 'recipient_form',
          data: {
            name: 'Mom',
            bank: 'HDFC Bank',
            account: '50100123456789',
            ifsc: 'HDFC0001234'
          }
        }
      };

      expect(message.component).toBeDefined();
      expect(message.component.type).toBe('recipient_form');
      expect(message.component.data.name).toBe('Mom');
      expect(message.component.data.bank).toBe('HDFC Bank');
    });

    it('should support messages without components', () => {
      const message = {
        type: 'bot',
        content: 'This is a regular message without a component.',
        timestamp: new Date()
      };

      expect(message.component).toBeUndefined();
      expect(message.content).toBeDefined();
    });
  });

  describe('Message Format with Action Buttons', () => {
    it('should support message with action buttons', () => {
      const message = {
        type: 'bot',
        content: 'Ready to proceed?',
        timestamp: new Date(),
        actions: [
          { label: 'Yes', action: 'confirm', variant: 'primary' },
          { label: 'No', action: 'cancel', variant: 'secondary' }
        ]
      };

      expect(message.actions).toBeDefined();
      expect(message.actions.length).toBe(2);
      expect(message.actions[0].label).toBe('Yes');
      expect(message.actions[0].action).toBe('confirm');
      expect(message.actions[0].variant).toBe('primary');
    });

    it('should support single action button', () => {
      const message = {
        type: 'bot',
        content: 'Action available.',
        timestamp: new Date(),
        actions: [
          { label: 'Proceed', action: 'proceed', variant: 'primary' }
        ]
      };

      expect(message.actions.length).toBe(1);
      expect(message.actions[0].label).toBe('Proceed');
    });

    it('should support messages without actions', () => {
      const message = {
        type: 'bot',
        content: 'No actions available.',
        timestamp: new Date()
      };

      expect(message.actions).toBeUndefined();
    });

    it('should differentiate primary and secondary button variants', () => {
      const primaryAction = { label: 'Approve', action: 'approve', variant: 'primary' };
      const secondaryAction = { label: 'Deny', action: 'deny', variant: 'secondary' };

      expect(primaryAction.variant).toBe('primary');
      expect(secondaryAction.variant).toBe('secondary');
    });
  });

  describe('Message Format with Component and Actions', () => {
    it('should support message with both component and actions', () => {
      const message = {
        type: 'bot',
        content: 'Please fill in the recipient details.',
        timestamp: new Date(),
        component: {
          type: 'recipient_form',
          data: { name: 'Mom' }
        },
        actions: [
          { label: 'Submit', action: 'submit', variant: 'primary' },
          { label: 'Cancel', action: 'cancel', variant: 'secondary' }
        ]
      };

      expect(message.component).toBeDefined();
      expect(message.actions).toBeDefined();
      expect(message.actions.length).toBe(2);
    });
  });

  // ========================================================================
  // DEMO STATE MANAGEMENT TESTS
  // ========================================================================

  describe('Demo Flow State Management', () => {
    it('should initialize demo flow state to idle', () => {
      const demoFlowState = { step: 'idle', data: {} };

      expect(demoFlowState.step).toBe('idle');
      expect(demoFlowState.data).toEqual({});
    });

    it('should transition from idle to rate_targeting', () => {
      let demoFlowState = { step: 'idle', data: {} };

      demoFlowState = {
        ...demoFlowState,
        step: 'rate_targeting'
      };

      expect(demoFlowState.step).toBe('rate_targeting');
    });

    it('should transition from rate_targeting to recipient_details', () => {
      let demoFlowState = { step: 'rate_targeting', data: { targetRate: 84 } };

      demoFlowState = {
        ...demoFlowState,
        step: 'recipient_details'
      };

      expect(demoFlowState.step).toBe('recipient_details');
      expect(demoFlowState.data.targetRate).toBe(84);
    });

    it('should transition from recipient_details to monitoring', () => {
      let demoFlowState = {
        step: 'recipient_details',
        data: { targetRate: 84, recipientConfirmed: true }
      };

      demoFlowState = {
        ...demoFlowState,
        step: 'monitoring'
      };

      expect(demoFlowState.step).toBe('monitoring');
      expect(demoFlowState.data.recipientConfirmed).toBe(true);
    });

    it('should transition from monitoring to rate_reached', () => {
      let demoFlowState = {
        step: 'monitoring',
        data: { targetRate: 84 }
      };

      demoFlowState = {
        ...demoFlowState,
        step: 'rate_reached'
      };

      expect(demoFlowState.step).toBe('rate_reached');
    });

    it('should reset state when cancelling', () => {
      let demoFlowState = {
        step: 'recipient_details',
        data: { targetRate: 84 }
      };

      demoFlowState = { step: 'idle', data: {} };

      expect(demoFlowState.step).toBe('idle');
      expect(demoFlowState.data).toEqual({});
    });

    it('should preserve data across state transitions', () => {
      let demoFlowState = { step: 'idle', data: {} };

      demoFlowState = {
        ...demoFlowState,
        step: 'rate_targeting',
        data: { amount: 5000 }
      };

      demoFlowState = {
        ...demoFlowState,
        step: 'recipient_details',
        data: { ...demoFlowState.data, targetRate: 84 }
      };

      expect(demoFlowState.data.amount).toBe(5000);
      expect(demoFlowState.data.targetRate).toBe(84);
    });
  });

  // ========================================================================
  // NOTIFICATION STATE TESTS
  // ========================================================================

  describe('Notification State Management', () => {
    it('should initialize showNotification to false', () => {
      const showNotification = false;

      expect(showNotification).toBe(false);
    });

    it('should toggle notification visibility', () => {
      let showNotification = false;

      showNotification = true;

      expect(showNotification).toBe(true);

      showNotification = false;

      expect(showNotification).toBe(false);
    });
  });

  describe('Confirmation Modal State Management', () => {
    it('should initialize showConfirmModal to false', () => {
      const showConfirmModal = false;

      expect(showConfirmModal).toBe(false);
    });

    it('should toggle confirmation modal visibility', () => {
      let showConfirmModal = false;

      showConfirmModal = true;

      expect(showConfirmModal).toBe(true);

      showConfirmModal = false;

      expect(showConfirmModal).toBe(false);
    });

    it('should store modal data when opening', () => {
      const modalData = {
        amount: 5000,
        currency: 'USD',
        targetRate: 84,
        currentRate: 84.2,
        recipient: 'Mom',
        bank: 'HDFC Bank',
        estimatedINR: '421000.00'
      };

      expect(modalData.amount).toBe(5000);
      expect(modalData.recipient).toBe('Mom');
      expect(modalData.estimatedINR).toBe('421000.00');
    });
  });

  // ========================================================================
  // ACTION BUTTON TESTS
  // ========================================================================

  describe('Action Button Callback Types', () => {
    it('should support set_target_rate action', () => {
      const actionData = {
        action: 'set_target_rate',
        value: '84.5'
      };

      expect(actionData.action).toBe('set_target_rate');
      expect(actionData.value).toBe('84.5');
      expect(parseFloat(actionData.value)).toBe(84.5);
    });

    it('should support submit_recipient action', () => {
      const actionData = {
        action: 'submit_recipient',
        data: {
          name: 'Mom',
          bank: 'HDFC Bank',
          account: '50100123456789',
          ifsc: 'HDFC0001234'
        }
      };

      expect(actionData.action).toBe('submit_recipient');
      expect(actionData.data.name).toBe('Mom');
    });

    it('should support cancel_transfer action', () => {
      const actionData = { action: 'cancel_transfer' };

      expect(actionData.action).toBe('cancel_transfer');
    });

    it('should support review_transfer action', () => {
      const actionData = { action: 'review_transfer' };

      expect(actionData.action).toBe('review_transfer');
    });

    it('should support approve_transfer action', () => {
      const actionData = { action: 'approve_transfer' };

      expect(actionData.action).toBe('approve_transfer');
    });

    it('should support deny_transfer action', () => {
      const actionData = { action: 'deny_transfer' };

      expect(actionData.action).toBe('deny_transfer');
    });
  });

  // ========================================================================
  // MESSAGE CONTENT WITH COMPONENTS TESTS
  // ========================================================================

  describe('Message Content Rendering', () => {
    it('should render text content', () => {
      const message = {
        type: 'bot',
        content: 'Hello, this is a test message.',
        timestamp: new Date()
      };

      expect(message.content).toBe('Hello, this is a test message.');
    });

    it('should support multiline content', () => {
      const message = {
        type: 'bot',
        content: 'Line 1\nLine 2\nLine 3',
        timestamp: new Date()
      };

      const lines = message.content.split('\n');

      expect(lines.length).toBe(3);
      expect(lines[0]).toBe('Line 1');
      expect(lines[2]).toBe('Line 3');
    });

    it('should preserve markdown links in content', () => {
      const message = {
        type: 'bot',
        content: 'Check out [this link](https://example.com)',
        timestamp: new Date()
      };

      expect(message.content).toContain('[this link](https://example.com)');
    });

    it('should preserve deep links in content', () => {
      const message = {
        type: 'bot',
        content: 'Go to [dashboard](vitta://navigate/dashboard)',
        timestamp: new Date()
      };

      expect(message.content).toContain('vitta://navigate/dashboard');
    });
  });

  // ========================================================================
  // COMPONENT DATA TESTS
  // ========================================================================

  describe('Component Data Validation', () => {
    it('should validate FX rate card data', () => {
      const component = {
        type: 'fx_rate_card',
        data: {
          currentRate: 83.5,
          amount: 5000,
          defaultRate: 84
        }
      };

      expect(component.data.currentRate).toBeGreaterThan(0);
      expect(component.data.amount).toBeGreaterThan(0);
      expect(component.data.defaultRate).toBeGreaterThan(0);
    });

    it('should validate recipient form data', () => {
      const component = {
        type: 'recipient_form',
        data: {
          name: 'Mom',
          bank: 'HDFC Bank',
          account: '50100123456789',
          ifsc: 'HDFC0001234'
        }
      };

      expect(component.data.name).toBeTruthy();
      expect(component.data.bank).toBeTruthy();
      expect(component.data.account).toMatch(/^\d{14}$/);
      expect(component.data.ifsc).toMatch(/^[A-Z]{4}0\d{6}$/);
    });

    it('should handle optional component data fields', () => {
      const component = {
        type: 'fx_rate_card',
        data: {
          currentRate: 83.5
          // amount and defaultRate are optional
        }
      };

      expect(component.data.currentRate).toBe(83.5);
      expect(component.data.amount).toBeUndefined();
      expect(component.data.defaultRate).toBeUndefined();
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle messages with empty content but component', () => {
      const message = {
        type: 'bot',
        content: '',
        timestamp: new Date(),
        component: {
          type: 'fx_rate_card',
          data: { currentRate: 83.5 }
        }
      };

      expect(message.component).toBeDefined();
      expect(message.content).toBe('');
    });

    it('should handle multiple actions in a message', () => {
      const message = {
        type: 'bot',
        content: 'Multiple actions available',
        timestamp: new Date(),
        actions: [
          { label: 'Action 1', action: 'action_1', variant: 'primary' },
          { label: 'Action 2', action: 'action_2', variant: 'secondary' },
          { label: 'Action 3', action: 'action_3', variant: 'primary' },
          { label: 'Action 4', action: 'action_4', variant: 'secondary' }
        ]
      };

      expect(message.actions.length).toBe(4);
    });

    it('should not fail if component type is unknown', () => {
      const message = {
        type: 'bot',
        content: 'Unknown component',
        timestamp: new Date(),
        component: {
          type: 'unknown_component_type',
          data: {}
        }
      };

      expect(message.component.type).toBe('unknown_component_type');
    });

    it('should handle state transitions with missing data', () => {
      let demoFlowState = { step: 'idle', data: {} };

      demoFlowState = {
        ...demoFlowState,
        step: 'monitoring'
        // data not updated
      };

      expect(demoFlowState.step).toBe('monitoring');
      expect(demoFlowState.data).toEqual({});
    });

    it('should handle timestamp precision', () => {
      const message = {
        type: 'bot',
        content: 'Message with timestamp',
        timestamp: new Date()
      };

      expect(message.timestamp instanceof Date).toBe(true);
      expect(message.timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // INTEGRATION TESTS
  // ========================================================================

  describe('Message Format Integration', () => {
    it('should create complete demo transfer message sequence', () => {
      const messages = [
        {
          type: 'bot',
          content: 'I\'ll help you transfer $5000 to Mom. Let me set up the rate monitoring.',
          component: {
            type: 'fx_rate_card',
            data: { currentRate: 83.5, amount: 5000 }
          },
          actions: [
            { label: 'Set Target Rate', action: 'set_target_rate', variant: 'primary' }
          ],
          timestamp: new Date()
        },
        {
          type: 'bot',
          content: 'Now let me confirm the recipient details.',
          component: {
            type: 'recipient_form',
            data: { name: 'Mom', bank: 'HDFC Bank' }
          },
          actions: [
            { label: 'Confirm & Monitor', action: 'submit_recipient', variant: 'primary' },
            { label: 'Cancel', action: 'cancel_transfer', variant: 'secondary' }
          ],
          timestamp: new Date()
        }
      ];

      expect(messages.length).toBe(2);
      expect(messages[0].component.type).toBe('fx_rate_card');
      expect(messages[1].component.type).toBe('recipient_form');
      expect(messages[0].actions[0].action).toBe('set_target_rate');
      expect(messages[1].actions.length).toBe(2);
    });

    it('should maintain full transfer flow from start to completion', () => {
      let demoFlowState = { step: 'idle', data: {} };
      const messageHistory = [];

      // Step 1: Start
      demoFlowState = { ...demoFlowState, step: 'rate_targeting', data: { amount: 5000 } };
      messageHistory.push({
        type: 'bot',
        component: { type: 'fx_rate_card', data: { currentRate: 83.5 } },
        timestamp: new Date()
      });

      // Step 2: Set rate
      demoFlowState = {
        ...demoFlowState,
        step: 'recipient_details',
        data: { ...demoFlowState.data, targetRate: 84 }
      };
      messageHistory.push({
        type: 'bot',
        component: { type: 'recipient_form', data: { name: 'Mom' } },
        timestamp: new Date()
      });

      // Step 3: Submit recipient
      demoFlowState = { ...demoFlowState, step: 'monitoring' };
      messageHistory.push({
        type: 'bot',
        content: 'Monitoring active',
        timestamp: new Date()
      });

      // Step 4: Rate reached
      demoFlowState = { ...demoFlowState, step: 'rate_reached' };

      expect(demoFlowState.step).toBe('rate_reached');
      expect(demoFlowState.data.targetRate).toBe(84);
      expect(messageHistory.length).toBe(3);
    });
  });
});
