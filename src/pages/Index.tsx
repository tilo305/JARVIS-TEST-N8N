import { ChatContainer } from '@/components/ChatContainer';

/**
 * Home page – mounts the JARVIS chat interface.
 * ChatContainer uses WebSocket for real-time communication via websocket-proxy service.
 */
const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-y-auto">
      <ChatContainer />
    </div>
  );
};

export default Index;
