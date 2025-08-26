
import React from 'react';
import Joyride, { type Step, type CallBackProps, STATUS } from 'react-joyride';

interface OnboardingTourProps {
  run: boolean;
  onTourComplete: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ run, onTourComplete }) => {
  const steps: Step[] = [
    {
      target: '#projects-list',
      content: "Welcome! Start by organizing your work into different Projects.",
      disableBeacon: true,
      placement: 'right',
    },
    {
      target: '#knowledge-base',
      content: "Upload your own documents here to create a personal knowledge base for each project.",
      placement: 'right',
    },
    {
      target: '#synthesis-button',
      content: "Select two or more documents and click here to have the AI create a detailed synthesis for you.",
      placement: 'right',
    },
    {
      target: '#research-mode-toggle',
      content: "Switch between 'Deep Research' for comprehensive answers and 'Find Documents' for locating specific files online.",
      placement: 'top',
    },
    {
      target: '#chat-input',
      content: "Type your research questions here to begin!",
      placement: 'top',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: (typeof STATUS[keyof typeof STATUS])[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      onTourComplete();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: '#1f2937', // gray-800
          backgroundColor: '#1f2937', // gray-800
          primaryColor: '#2563eb', // blue-600
          textColor: '#f9fafb', // gray-50
          zIndex: 1000,
        },
        tooltip: {
            border: '1px solid #374151', // gray-700
            borderRadius: '0.5rem',
            textAlign: 'left',
            padding: '1rem',
        },
        buttonClose: {
            color: '#9ca3af', // gray-400
        },
        buttonNext: {
            fontWeight: 600,
        },
        buttonBack: {
            color: '#d1d5db', // gray-300
        }
      }}
    />
  );
};

export default OnboardingTour;
