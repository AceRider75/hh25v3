![IXsAtDG_kWITfVcoIq7FN](https://github.com/user-attachments/assets/b7c6517c-3848-4f3b-bc34-28421a599d02)

# 🚀 Groqity Groq

Breaking Language Barriers with AI-Powered Conversations

## 📌 Problem Statement

**Problem Statement 1 – Weave AI magic with Groq**

## 🎯 Objective

Groqity Groq addresses the challenge of seamless cross-lingual communication. It solves the problem of translation by generating audio output for text prompts, enabling users to respond effectively in different languages, even when communicating internationally. This project serves a broad audience, including travelers, international business professionals, language learners, and anyone needing quick, private, multi-modal translation, by offering diverse input (text, audio, image) and output (text, audio) options while ensuring complete user privacy.

## 🧠 Team & Approach

**Team Name:**
c0mpile_ERr0r

**Team Members:**
*   Subhrajit Mukherjee       : **github.com/AceRider75/hh25v3/**
*   Krishnendu Banerjee
*   Kalpak Majumdar
  
**Our Approach:**
*   **Why we chose this problem:** We noticed a gap in the market for chatbots that seamlessly integrate multi-language support, multiple input methods (text, audio, image), and prioritized user privacy through local storage.
*   **Key challenges addressed:**
    *   Implementing robust multi-lingual conversation capabilities.
    *   Integrating diverse input methods (text, audio, image) for user flexibility.
    *   Ensuring conversation context is maintained within a session.
    *   Guaranteeing user privacy by avoiding server-side database storage for chats.
*   **Pivots/Breakthroughs:** Integrating Groq's fast processing significantly enhanced the real-time feel of the conversation and translation features. Utilizing local storage for chat history was a key decision for privacy.

## 🛠️ Tech Stack

**Core Technologies Used:**
*   **Frontend:** HTML, CSS, JavaScript
*   **Backend:** JavaScript, Python
*   **Database:** None (Chats stored in browser Local Storage for privacy)
*   **APIs:** Groq API, Hugging Face API 
*   **Hosting:** Local

**Sponsor Technologies Used:**
*   **Groq:** Utilized for core natural language processing, generating text responses quickly, handling translation tasks, and powering the basic chatbot conversational logic.

## ✨ Key Features

* ✅ **Multi-Language Support:** Converse and translate across various languages.
* ✅ **Multiple Input/Output Methods:** Accepts text, audio, and image inputs; provides text and audio outputs.
* ✅ **Contextual Memory:** Remembers the conversation context within the current session (until refreshed).
* ✅ **Full Privacy:** No chat data stored server-side; all conversations reside in the user's local storage.


## 📽️ Demo & Deliverables

*   **Demo Video Link:** [https://youtu.be/iqdVjZFobP8?si=bQxvVUactUGH06Nw]
*   **Pitch Deck / PPT Link:** [https://docs.google.com/presentation/d/1iZO8YV6WkYA_Vj6Y7dAJEw6s6_tz7ExpAStcaGjdSu4/edit?usp=sharing]

## ✅ Tasks & Bonus Checklist

*   ⬜ All members of the team completed the mandatory task - Followed at least 2 of our social channels and filled the form.
*   ✅ All members of the team completed Bonus Task 1 - Sharing of Badges and filled the form (2 points).
*   ✅ All members of the team completed Bonus Task 2 - Signing up for Sprint.dev and filled the form (3 points). 

## 🧪 How to Run the Project

**Requirements:**
*   Python
*   Web Browser with Local Storage enabled
*   API Keys for Groq and Hugging Face
*   `.env` file for API keys

**Local Setup:**

1.  **Clone the repository:**
    ```
    git clone https://github.com/AceRider75/hh25v3 # Replace with your actual repo URL
    cd hh25v3
    ```

2.  **Install Backend Dependencies:**
    ```
    pip install -r requirements.txt
    ```
    

4.  **Environment Setup:**
    *   Create a `.env` file in the root (or relevant backend) directory.
    *   Add your API keys:
        ```
        GROQ_API_KEY=your_groq_api_key
        HUGGINGFACE_API_TOKEN=your_huggingface_token
        ```

5.  **Run the Project:**
    *   **Start Backend Server:** 
        ```
        # In the backend directory
        uvicorn main:app --reload
        ```
6.  Open your browser and navigate to `127.0.0.1:8000` (the port specified by the frontend dev server).

**Notes:** Ensure the backend server is running before starting the frontend. The frontend will make requests to the backend API endpoints.

## 🧬 Future Scope

*   📈 **More Integrations:** Connect with messaging platforms (WhatsApp, Slack) or productivity tools.
*   🗣️ **Improved Speech Recognition/Synthesis:** Integrate more advanced models for better accuracy and naturalness.
*   🖼️ **Enhanced Image Understanding:** Allow more complex interactions based on image content.
*   🛡️ **Security Enhancements:** Although chats are local, implement frontend best practices.
*   🌐 **Broader Accessibility:** Improve UI/UX for users with disabilities.
*   💾 **Optional Cloud Sync:** Offer opt-in cloud backup/sync for conversations across devices (with strong encryption).

## 📎 Resources / Credits

*   **APIs:**
    *   [Groq API](https://console.groq.com/docs/api)
    *   [Hugging Face APIs/Models](https://huggingface.co/docs)
*   **Libraries:** Whisper, pillow, gtts, transformers, groq, huggingfacehub
*   **Acknowledgements:** Thanks to the hackathon organizers, mentors, and the open-source community.

## 🏁 Final Words

This hackathon was an exciting challenge! Integrating multiple APIs and input methods while prioritizing privacy was demanding but rewarding. We learned a lot about Groq's speed and the nuances of building multi-modal interfaces. It was fun collaborating as `c0mpile_ERr0r` and bringing Groqity Groq to life. Shout-out to the organizers for a great event!
