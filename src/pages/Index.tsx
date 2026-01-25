import { ChatContainer } from '@/components/ChatContainer';

/**
 * Home page – mounts the JARVIS chat interface.
 * ChatContainer is bridged to the N8N webhook via @/api/n8n.
 */
const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-y-auto">
      <ChatContainer />
    </div>
  );
};

export default Index;
