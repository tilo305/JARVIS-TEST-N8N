# Building User Interfaces: Design Principles for Voice User Interfaces

**Professor Bilge Mutlu**

---

## Table of Contents

- [What Will We Learn Today?](#what-will-we-learn-today)
- [Design Principles for Conversational Interfaces](#design-principles-for-conversational-interfaces)
  - [Elephant in the Room](#elephant-in-the-room)
  - [Gricean Maxims](#gricean-maxims)
  - [Multimodality](#multimodality)
  - [Interaction Paradigm](#interaction-paradigm)
  - [Turn-Taking](#turn-taking)
  - [Conversational Markers](#conversational-markers)
  - [Confirmations](#confirmations)
  - [Error Handling](#error-handling)
  - [Flowcharting Conversational Interactions](#flowcharting-conversational-interactions)
- [Usability Heuristics for Conversational Interfaces](#usability-heuristics-for-conversational-interfaces)
  - [General Heuristics](#general-heuristics)
  - [Conversational Style](#conversational-style)
  - [Guiding, Teaching, and Offering Help](#guiding-teaching-and-offering-help)
  - [Feedback and Prompts](#feedback-and-prompts)
  - [Errors](#errors)
- [Summary](#summary)

---

## What Will We Learn Today?

- Design principles for conversational interfaces
- Usability heuristics for conversational interfaces

---

## Design Principles for Conversational Interfaces

### Elephant in the Room

#### Recap: Definition of Usability

> The effectiveness, efficiency, and satisfaction with which a specified set of users can achieve a specified set of tasks in a particular environment.
> 
> — ISO 9241-11

#### The Reality

**Conversational interfaces are almost always less effective, less efficient, and less satisfactory than graphical user interfaces.**

- **Effectiveness**: Conversational interfaces are more error prone due to technology, ambiguities, and environmental influences.
- **Efficiency**: Using conversational interfaces is almost never as fast as using graphical user interfaces.
- **Satisfaction**: Interacting with conversational interfaces can be awkward, socially inappropriate, and frustrating.

#### So, What Is the Point of Conversational Interfaces?

**Where do these interfaces deliver value?**

1. Streamlining app installation, login, payment, notifications, and so on in a conversational paradigm.[^1]

2. In some contexts, e.g., while driving, CIs are more effective, efficient, and satisfactory due to resource constraints.

3. CIs address many accessibility problems, including:
   - Vision (e.g., blindness)
   - Motor (e.g., tremor)
   - Cognitive (e.g., dyslexia) deficiencies

[^1]: Grover, 2016, "Bots won't replace apps. Better apps will replace apps."

---

### Gricean Maxims

**Definition**: Proposed by Paul Grice, conversations follow the cooperative principle and four key maxims:[^2]

- **Maxim of quality** (truthful and accurate communication)
- **Maxim of quantity** (just the right amount of information)
- **Maxim of relevance** (appropriate and relevant information)
- **Maxim of manner** (clear, cooperative communication)

[^2]: Grice, 1975, *Logic and Conversation*

---

### Multimodality

**Definition**: Multimodal interfaces utilize multiple modalities, including visual information, speech, touch, and so on, in user experiences they afford.

*Most conversational interfaces are multimodal interfaces.*

#### Multimodality Principle

> Take advantage of other modalities, e.g., visual information, vibrations, etc., wherever appropriate.

Using multimodal components, you can provide users with breaks for decision making, interruptions, etc.

#### Potential Caveats

- Ask, "does my interface still support a speech-only interaction?"
- The conversational and other components must be designed together to fit within the conversation.

---

### Interaction Paradigm

Conversational interfaces can follow different paradigms depending on the context of use and the design of the application:

1. **Command-and-control interfaces** (always-on voice assistants)
2. **Conversational interfaces** (chatbots, task assistants, social robots)

#### Command-and-Control Interfaces

**Definition**: Interfaces where speech input is mapped to specific system functions that are called immediately.

These interfaces commonly utilize:

- Expressing user intent using a wake word (e.g., "OK, Google") or the pressing of a button (e.g., home button in the iPhone)
- Indicating listening and understanding
- Executing the mapped function

#### Conversational Interfaces

**Definition**: Interfaces where the interaction with the system has the characteristics of human conversations, including turn taking, theoretically infinite depth, conversational markers, etc.

---

### Turn-Taking

**Definition**: Speaking turns is the core, cooperative structure of conversations that involves one speaker at a time and an explicit exchange of tokens.

#### Principles

- **One speaker at a time** — transparency in who is speaking
- **Turn exchanges** — explicit signaling of who will speak next
- **Interruption handling** — very difficult with CIs

---

### Conversational Markers

**Definition**: Speech cues that indicate the state or the direction of the conversation.[^3]

#### Types of Conversational Markers

- **Timelines** ("First," "Halfway there," "Finally")
- **Acknowledgements** ("Thanks," "Got it," "Alright," "Sorry about that")
- **Positive feedback** ("Good job," "Nice to hear that")

[^3]: Pearl, 2016, *Designing Voice User Interfaces: Principles of Conversational Experiences*

#### Example Conversation

```
Assistant: I'll be asking you a few questions about your health. 
           First, how many hours of sleep did you get last night?
User:      About seven.
Assistant: Good job. And how many servings of fruits and vegetables 
           did you eat yesterday?
User:      Maybe four.
Assistant: Got it. Last question—were you able to take your 
           medication last night?
User:      Yes.
Assistant: All right. That's it for now. I'll talk to you again 
           tomorrow. Goodbye.
```

---

### Confirmations

**Definition**: CIs are designed with explicit forms of confirmation to improve system usability and transparency. Can be explicit vs. implicit and speech-based vs. non-speech based (visual, action).

#### Types of Confirmations

**Explicit confirmation**: Requiring the user to confirm:
> "I think you want to set a reminder to 'buy insurance before going skydiving next week.' Is that right?"

**Implicit confirmation**: Letting user know what was understood:
> "Ok, setting a reminder to buy insurance..."

---

### Error Handling

**Definition**: Deviations from expected conversational flow due to technical mistakes, unexpected user behavior, environmental influences, etc.

#### Types of Errors

- No speech detected
- Speech detected, but nothing recognized
- Something was recognized correctly, but the system does the wrong thing with it
- Something was recognized incorrectly

---

### Flowcharting Conversational Interactions

The most commonly used method of modeling and prototyping conversational interactions is defining flows that show how the interaction will flow depending on system state, user behavior, or external influences.

---

## Usability Heuristics for Conversational Interfaces

### Recap: What Are Usability Heuristics?

**Definition**: Developed by Jacob Nielsen, heuristic evaluation involves having a small set of evaluators examine the interface and judge its compliance with recognized usability principles (the "heuristics").[^4]

[^4]: NN/g: How to conduct a heuristic evaluation

### Heuristics for Conversational Interfaces

**Seventeen heuristics** that fall into five broad categories:[^5]

- General
- Conversational style
- Guiding, Teaching, and Offering Help
- Feedback and prompts
- Errors

[^5]: Wei & Landay, 2018, *Speech-based Conversational Agent Heuristics*

---

### General Heuristics

#### Heuristic #1 (S1): Give the Agent a Persona

Give the agent a persona through language, sounds, and other styles. Create an illusion by being consistent. Make sure to do this without being distracting.

#### Heuristic #2 (S2): Make the System Status Clear

Make the system status clear. Use verbal, sound, or multimodal feedback. Communicate delays immediately and give feedback while "busy".

#### Heuristic #3 (S3): Speak the User's Language

Speak the user's language. Use words, phrases and concepts familiar to end users, rather than system-oriented or technical jargon.

#### Heuristic #4 (S4): Start and Stop Conversations

Start and stop conversations. Use a wake word to start a conversation, but don't require it again in the same conversation. Gracefully end conversations when the user is done.

#### Heuristic #5 (S5): Pay Attention to Context

Pay attention to what the user said and respect the user's context. 

- Leverage user input when it can be used as a parameter to a command
- Remember what the user has said in the current conversation
- Use context you already know about the user to fill in fields, but confirm them
- Use context to respond intelligently (e.g., location/environment, time constraints, # of users, user identity/age)

---

### Conversational Style

#### Heuristic #6 (S6): Use Spoken Language Characteristics

Use spoken language characteristics:

- Use discourse markers as part of confirmations and prompts to make conversation more natural (e.g., "next", "and", "so", "actually", "sure", "ok", "got it")
- Leverage prosody, including rhythm, tone, pauses, emphasis, discourse fillers (e.g., "uh", "uhm", "hmm", "ah", "like")

#### Heuristic #7 (S7): Make Conversation a Back-and-Forth Exchange

Make conversation a back-and-forth exchange:

- Don't always prompt for everything all at once
- Take turns and don't let instructions get in the way
- Give users a chance before jumping in

#### Heuristic #8 (S8): Adapt Agent Style

Adapt agent style to who users are, how they speak, and how they are feeling:

- Users prefer agents that have conversational style similar to their own — match it
- Match the user's emotion, gender, and personality

---

### Guiding, Teaching, and Offering Help

#### Heuristic #9 (S9): Guide Users Through a Conversation

Guide users through a conversation so they are not easily lost:

- Guide subtly using natural affordances rather than explicitly
- Guide user towards desired response and cue the user what type of response is desired
- Allow data to be naturally given in response to single or multiple prompts

#### Heuristic #10 (S10): Help Users Discover What Is Possible

Use responses to help users discover what is possible:

- Teach multiple possible ways of asking for a result
- Use examples in a natural manner rather than teaching commands explicitly

---

### Feedback and Prompts

#### Heuristic #11 (S11): Keep Feedback and Prompts Short

Keep feedback and prompts short:

- Clear but succinct
- Keep lists of items short (3-5 max.), and let people ask if they want to hear more
- Let experienced users have faster and shorter prompts

#### Heuristic #12 (S12): Confirm Input Intelligently

Confirm input intelligently:

- Confirm input implicitly through results or next prompt
- Confirm irreversible or critical actions explicitly and even allow undo after confirmation

#### Heuristic #13 (S13): Use Speech-Recognition System Confidence

Use speech-recognition system confidence to drive feedback style:

- **High**: Do it and tell me
- **Moderate**: Confirm input
- **Low**: Re-prompt ("Say that again?")

#### Heuristic #14 (S14): Use Multimodal Feedback When Available

Use multimodal feedback when available:

- Lights
- Graphic displays
- Sounds

---

### Errors

#### Heuristic #15 (S15): Avoid Cascading Correction Errors

Avoid cascading correction errors:

- Escalate detail in prompts when input is ambiguous or incorrect
- If input results in multiple hypotheses, let user select from list with "yes" / "no"
- For error correction, use a different modality or voice response style (e.g., select from a list)

#### Heuristic #16 (S16): Use Normal Language in Communicating Errors

Use normal language in communicating errors:

- Vary (error) prompt wording on re-prompts
- Don't blame the user for errors (don't say: "that was not a valid response")
- Don't show mock concern (don't say: "I'm sorry. I did not understand the response I heard.")

#### Heuristic #17 (S17): Allow Users to Exit from Errors

Allow users to exit from errors or a mistaken conversation:

- Use a special escape word globally (e.g., "Stop")
- Use non-speech methods when speech fails (e.g., push a physical button)

---

## Summary

### What Did We Learn Today?

- Design principles for conversational interfaces
- Usability heuristics for conversational interfaces

---

## References

- Grover, T. (2016). *Bots won't replace apps. Better apps will replace apps.*
- Grice, H. P. (1975). *Logic and Conversation.*
- Pearl, C. (2016). *Designing Voice User Interfaces: Principles of Conversational Experiences.*
- Wei, J., & Landay, J. A. (2018). *Speech-based Conversational Agent Heuristics.*
- Nielsen Norman Group: *How to conduct a heuristic evaluation*
- ISO 9241-11: *Ergonomics of human-system interaction*

---

*Building User Interfaces | Professor Mutlu | Lecture 19: Design Principles for Voice User Interfaces*

