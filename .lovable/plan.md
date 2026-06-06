I will build a WhatsApp management system that connects to the Evolution API.

### Steps:
1.  **Configure API Client**: Create a service to interact with the Evolution API, handling authentication and instance management.
2.  **Connection Management**: Build a dashboard to manage Evolution API instances (create, connect via QR Code, check status).
3.  **Chat Interface**: Implement a multi-pane chat interface to list conversations and display message history.
4.  **Integration for AI Agent**: Add a dedicated section or toggle to enable/configure an AI agent (webhook or integration settings) for the connected instance.

### Technical Details:
-   **Frontend**: React (TanStack Start), Tailwind CSS, Lucide icons.
-   **State Management**: TanStack Query for API data fetching.
-   **API Integration**: Evolution API (v2 preferred).
-   **Components**: Instance selector, QR Code display, Sidebar for chat list, Main chat window.

### User Requirements Note:
-   No logo needed as requested.
-   Focus on connecting and viewing all WhatsApp conversations.
-   Preparation for an AI agent connection.