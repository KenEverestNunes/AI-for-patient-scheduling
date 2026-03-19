# Kyron Medical — Voice AI Patient Scheduling Platform

An advanced, human-like AI medical receptionist designed to streamline patient intake and appointment scheduling using cutting-edge Voice AI and LLM technologies.

## 🚀 Live Demo
**Website:** [http://18.221.214.43/](http://18.221.214.43/)
**AI Name:** Riley (Scheduling Assistant)

## ✨ Core Features
- **Elite Liquid Glass UI**: A premium, high-performance interface built with React and Tailwind CSS, featuring smooth micro-animations and a modern medical aesthetic.
- **Intelligent Intake**: Seamlessly collects patient information (Name, DOB, Phone, Email) and uses semantic reasoning to match conditions to the correct medical specialists.
- **Multi-Doctor Scheduling**: Supports specialized booking across Orthopedics, Cardiology, Dermatology, and Gastroenterology with high-fidelity availability logic.
- **Voice AI Handoff**: A core feature allowing patients to transition a web chat into a live phone call seamlessly. The Voice AI (via Vapi) retains full context of the previous web chat.
- **Smart Call-Back Memory**: Pioneering a persistent memory layer that allows patients to call back the AI later and resume their conversation exactly where they left off.
- **Secure Persistence**: Enterprise-grade state management ensures patient data and chat history survive server restarts and session timeouts.
- **Automated Confirmations**: Integrated with SendGrid to provide instant appointment confirmations via email.

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express.js
- **AI Engine**: Groq (Llama-3.3-70B-Versatile) for low-latency, high-intelligence reasoning
- **Voice Stack**: Vapi (End-to-End Voice AI), Ngrok (Webhook Tunneling)
- **Infrastructure**: AWS EC2 (Ubuntu), Nginx (Reverse Proxy)
- **Email**: SendGrid API

## 📖 How it Works
1. **Intake**: Patient enters their details and the reason for their visit.
2. **Chat**: Riley (the AI) analyzes the symptom (e.g., "knee pain") and matches the patient to the right specialist (e.g., Dr. Chen - Orthopedics).
3. **Booking**: The AI presents live time slots and books the appointment in the secure data store.
4. **Handoff**: With one click, the patient can request a phone call. Riley calls the patient and picks up the conversation natively on the phone.
5. **Recovery**: If a call drops, the patient can call Riley back, and she will say, *"I see we were chatting about your knee pain earlier..."*

## 🧑‍💻 Development
This platform was built with an **Outcome-Oriented** focus, prioritizing a robust MVP with high-quality user experience under a tight deadline. 

**Main Branch**: `main`
**Configuration**: See `.env.example` for required environment variables.

---
Built with ❤️ for the Kyron Medical Engineering Challenge.
