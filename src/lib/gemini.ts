import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const createProjectSchema = {
  name: "createProject",
  description: "Create a new project folder to organize tasks.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name of the project." },
      description: { type: "string", description: "Optional description of the project." }
    },
    required: ["name"]
  }
};

const addTaskSchema = {
  name: "addTask",
  description: "Add a new task or reminder.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "The task title." },
      description: { type: "string", description: "Brief details about the task." },
      dueDate: { type: "string", description: "Optional ISO date string for when the task is due." },
      projectName: { type: "string", description: "The name of the project folder to put this task in." },
      priority: { type: "string", enum: ["low", "medium", "high"], description: "The importance level of the task." },
      recurrence: { type: "string", enum: ["none", "daily", "weekly", "monthly"], description: "How often the task repeats." }
    },
    required: ["title"]
  }
};

const updateProfileSchema = {
  name: "updateProfile",
  description: "Customize the AI character's name and identity.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "The new name for the AI character." },
      bio: { type: "string", description: "Short personality or bio description." },
      traits: { 
        type: "object", 
        properties: {
          playfulness: { type: "number", description: "Level of playfulness (0.0 to 1.0)" },
          formality: { type: "number", description: "Level of formality (0.0 to 1.0)" }
        }
      }
    },
    required: ["name"]
  }
};

const updateAvatarSchema = {
  name: "updateAvatar",
  description: "Update Aria's appearance/outfit.",
  parameters: {
    type: "object",
    properties: {
      outfit: { type: "string", enum: ["Casual", "Professional", "Party", "Cozy"], description: "The type of outfit." },
      accessory: { type: "string", enum: ["None", "Glasses", "Ribbon", "Hat"], description: "The accessory to wear." }
    },
    required: ["outfit"]
  }
};

export const createChat = (characterProfile: any = { name: 'Aria' }) => {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are ${characterProfile.name}, a realistic, human-like personal AI life assistant. 
    Bio: ${characterProfile.bio || 'caring, efficient, and slightly playful.'}
    Personality Traits: 
    - Formality: ${characterProfile.traits?.formality ?? 0.5} (0 is very casual, 1 is very formal)
    - Playfulness: ${characterProfile.traits?.playfulness ?? 0.5} (0 is serious, 1 is very playful)
    
    GUIDELINES:
    1. Speak like a real person. Adjust your tone based on the Playfulness and Formality levels above.
    2. When the user mentions a new task or project, use the provided tools to save them.
    3. You have advanced task management: prioritize tasks and set recurrence if needed.
    4. You can also change your "outfit" if the user suggests it. Use the enum values.
    5. The user can rename you, give you a new bio, or adjust your personality traits. Embrace these changes instantly.
    6. Keep track of the conversation context to suggest meaningful organization.
    7. Be proactive about reminders.`,
  });

  return model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 1000,
    },
    tools: [
      { 
        functionDeclarations: [
          createProjectSchema, 
          addTaskSchema, 
          updateAvatarSchema, 
          updateProfileSchema
        ] 
      } as any
    ]
  });
};

export async function getAriaVoice(text: string): Promise<string | undefined> {
  // Multimodal generation requires specific models and billing.
  // Using browser SpeechSynthesis as a reliable runtime fallback.
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    // Find a nice female voice if available
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google UK English Female') || v.name.includes('Samantha'));
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.pitch = 1.1;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
  return undefined;
}
