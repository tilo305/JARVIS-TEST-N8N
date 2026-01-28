# 📚 UI/UX Reference Library

Essential reference materials for building modern web interfaces with best practices in user experience design.

---

## 1. WebGL Programming Guide - Key Concepts

**By Kouichi Matsuda & Rodger Lea**

### Core WebGL Principles

WebGL enables 3D graphics in web browsers without plugins. It follows OpenGL ES 2.0 specification and executes on the GPU.

**The Rendering Pipeline:**
```
Vertex Data → Vertex Shader → Primitive Assembly → Rasterization → 
Fragment Shader → Per-Fragment Operations → Framebuffer
```

### Shaders

**Vertex Shader** - Processes each vertex independently, transforming 3D coordinates to screen space.
- **Attributes:** Per-vertex data (position, color, normals)
- **Uniforms:** Global values (matrices, time, light direction)
- **Varyings:** Data passed to fragment shader (interpolated)

**Fragment Shader** - Determines the color of each pixel (fragment).
- Texturing and sampling
- Lighting calculations
- Special effects (glow, scan lines, distortion)
- Alpha blending for transparency

### Coordinate Systems & Transformations

```
Model Space → World Space → View Space → Clip Space → NDC → Screen Space
```

**Transformation Matrices:**
- **Model Matrix:** Object's position/rotation/scale in world
- **View Matrix:** Camera's position and orientation
- **Projection Matrix:** Perspective or orthographic projection
- **MVP Matrix:** Model × View × Projection (combined)

### Drawing Basic Shapes

WebGL can draw only three types of shapes directly:
- **Points:** `gl.POINTS`
- **Lines:** `gl.LINES`, `gl.LINE_STRIP`, `gl.LINE_LOOP`
- **Triangles:** `gl.TRIANGLES`, `gl.TRIANGLE_STRIP`, `gl.TRIANGLE_FAN`

Complex 3D objects are built from triangles. A game character may have tens of thousands of triangles.

### Buffer Objects

Five steps to pass data to vertex shader:
1. Create buffer object: `gl.createBuffer()`
2. Bind to target: `gl.bindBuffer(gl.ARRAY_BUFFER, buffer)`
3. Write data: `gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)`
4. Assign to attribute: `gl.vertexAttribPointer(location, size, type, false, 0, 0)`
5. Enable: `gl.enableVertexAttribArray(location)`

### Typed Arrays

WebGL uses typed arrays for performance:
- `Float32Array` - 32-bit floats (vertex coordinates, colors)
- `Uint16Array` - 16-bit unsigned integers (indices)
- `Int8Array`, `Uint8Array`, `Int16Array`, `Int32Array`, `Uint32Array`, `Float64Array`

### Transformation Matrices

**Rotation Matrix (Z-axis):**
```
[cos θ  -sin θ  0  0]
[sin θ   cos θ  0  0]
[0       0      1  0]
[0       0      0  1]
```

**Translation Matrix:**
```
[1  0  0  Tx]
[0  1  0  Ty]
[0  0  1  Tz]
[0  0  0  1 ]
```

**Scale Matrix:**
```
[Sx  0   0   0]
[0   Sy  0   0]
[0   0   Sz  0]
[0   0   0   1]
```

### Lighting

**Types of Light:**
- **Directional Light:** Light from specific direction (e.g., sun)
- **Point Light:** Light from specific position
- **Ambient Light:** General environmental light

**Reflection Types:**
- **Diffuse Reflection:** Surface color from light direction
- **Ambient Reflection:** Base illumination
- **Specular Reflection:** Shiny highlights

**Phong Lighting Formula:**
```glsl
vec3 color = ambient + diffuse * nDotL + specular * pow(sDotR, shininess);
```

### Advanced Techniques

**Alpha Blending:**
```javascript
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
```

**Depth Testing (Hidden Surface Removal):**
```javascript
gl.enable(gl.DEPTH_TEST);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
```

**Texture Mapping:**
```javascript
// 1. Load image
const image = new Image();
image.src = 'texture.png';

// 2. Create texture
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);

// 3. Set parameters
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

// 4. Upload image
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
```

---

## 2. Microinteractions Toolkit - Essential Patterns

**Reference cards for designing effective microinteractions**

Microinteractions are the smallest unit of user interaction - single-use-case product moments that provide feedback, enhance context, and create delightful experiences.

### 6 Functional Categories

#### 1. Notifications and Alerts

**Principles:**
- Visualize quantitative information
- Use notification as a nudge
- Enable appropriate medium of interaction
- Maintain functional continuity

**Key Strategies:**
- Show progress visually (progress bars, circular indicators)
- Use color coding for different states
- Reduce complexity by converting continuous data to discrete units
- Time notifications strategically for maximum engagement

**Examples:**
- **Progress Indicators:** Show download/upload status with animated bars
- **Status Updates:** Display battery, network, system status in real-time
- **Smart Nudges:** Send motivational notifications at optimal times

#### 2. Keeping Context

**Principles:**
- Maintain continuity within sequence of interactions
- Extend experiences across media
- Keep in touch with the moment
- Interact with physical objects through virtual interfaces

**Key Strategies:**
- Use animations to maintain context between steps
- Sync data across user's device ecosystem
- Make products aware of real-world context (time, location, events)
- Create relationships between physical objects through digital interfaces

**Examples:**
- **Sequential Flow:** Multi-step forms with continuous visual feedback
- **Cross-Device Sync:** Content automatically synchronized across devices
- **Contextual Awareness:** UI adapts to time, location, or events
- **Error Context:** Friendly, contextual error messages

#### 3. Setting Smart Defaults

**Principles:**
- Set preferences that reduce complexity
- Bring forward recent and repetitive actions
- Anticipate probable user actions
- Drive selection among large pool of choices

**Key Strategies:**
- Organize cluttered lists automatically
- Prioritize content based on detected context
- Show recently used items first
- Predict and suggest based on behavioral patterns

**Examples:**
- **Auto-categorization:** Automatically sort content into categories
- **Recent Actions:** Show last-used items first
- **Auto-suggest:** Predict common responses or actions
- **Smart Filtering:** Auto-detect content type and apply appropriate styling

#### 4. Interacting with Data Elements

**Principles:**
- Provide appropriate input method
- Provide live feedback
- Navigate through content efficiently

**Key Strategies:**
- Use sliders for range inputs instead of typing
- Provide word suggestions for better text input
- Enable live preview before committing actions
- Use multi-touch gestures for exploring details

**Examples:**
- **Range Selection:** Price slider with live value display
- **Auto-complete:** Suggestions while typing
- **Live Preview:** Filter preview before applying
- **Gesture Navigation:** Pinch-to-zoom, swipe gestures

#### 5. Writing, Linking, Sharing Content

**Principles:**
- Highlight content that needs focus
- Make links informative
- Give real-time feedback of actions

**Key Strategies:**
- Enlarge or highlight focus area
- Dim unnecessary background features
- Provide URL previews when sharing links
- Show typing status in real-time

**Examples:**
- **Focus Mode:** Hide UI elements during reading/writing
- **Link Previews:** Show image/title when sharing URLs
- **Status Indicators:** "Typing..." indicator in messaging
- **Progress Feedback:** Loading indicators show progress

#### 6. Preventing Human Error

**Principles:**
- Provide assistive information adjacent to inputs
- Provide buffer step/time before critical outcomes
- Reduce cognitive load
- Create opportunities for error rectification

**Key Strategies:**
- Show input format hints that disappear after entry
- Add confirmation step before destructive actions
- Auto-suggest to reduce memory requirements
- Highlight errors without blocking workflow

**Examples:**
- **Input Hints:** Sample format shown in empty fields
- **Confirmation Dialogs:** "Save changes?" before exiting
- **Auto-complete:** Suggestions reduce typos
- **Error Highlighting:** Non-blocking error indicators

### Design Strategies Summary

**For Notifications:**
1. Use best-suited visualization (graph, pie chart, timeline)
2. Color-code elements by status or functionality
3. Add visual appeal with icons or illustrations
4. Provide smart reasoning backed by data

**For Context:**
1. Identify individual steps in complex tasks
2. Show what needs to be done at each step
3. Use intuitive patterns (animations, transitions)
4. Generate device-specific interactions

**For Defaults:**
1. Organize content into simple categories
2. Suggest grouped choices to reduce decisions
3. Auto-detect and adapt to user's situation
4. Provide configuration options

**For Input:**
1. Use URL previews before sharing
2. Have WYSIWYG editors for visual data
3. Animate icons to indicate task nature
4. Detect and display content while typing

**For Error Prevention:**
1. Provide hints before and during input
2. Add extra step before critical actions
3. Use different interaction types at decision points
4. Generate suggestions upon input completion

---

## 3. Designing Interfaces - Core Patterns

**By Jenifer Tidwell, Charles Brewer, Aynne Valencia (3rd Edition)**

### Designing for People - Cognitive Patterns

Interfaces are means to users' ends. Users don't want to use your interface - they want to accomplish their goals.

**Key Behavioral Patterns:**

1. **Safe Exploration** - Users learn by trying, not reading
2. **Instant Gratification** - Immediate feedback keeps engagement
3. **Satisficing** - Users choose "good enough" over optimal
4. **Changes in Midstream** - Users change minds during tasks
5. **Deferred Choices** - Delay decisions until necessary
6. **Incremental Construction** - Build complex results through small steps
7. **Habituation** - Familiar patterns become automatic
8. **Spatial Memory** - Users remember where things are located
9. **Streamlined Repetition** - Make frequent actions effortless
10. **Keyboard Only** - Power users prefer shortcuts

### Information Architecture

**Four System Screen Types:**
1. **OVERVIEW** - List/grid of options
2. **FOCUS** - Single thing in detail
3. **MAKE** - Tools to create something
4. **DO** - Facilitate single task

**Essential Patterns:**

**Dashboard Pattern:**
- At-a-glance view of key metrics
- Real-time data updates
- Customizable widgets
- Critical for monitoring applications

**Hub and Spoke Pattern:**
```
        Section A
              |
Section D - [CORE] - Section B
              |
        Section C
```
- Central hub connects to all subsystems
- Users return to center
- Clear navigation paths

**Canvas Plus Palette:**
- Large workspace + tool palette
- Separate tools from work area
- Ideal for creative or control interfaces

**Alternative Views:**
- Multiple ways to view same data
- List, grid, map, chart views
- Essential for data analysis

### Navigation Patterns

**Clear Entry Points** - Obvious starting places
**Modal Panel** - Focused interaction without losing context
**Deep Links** - Direct access to specific states
**Escape Hatch** - Easy way to cancel/go back
**Progress Indicator** - Show where user is in process
**Breadcrumbs** - Show navigation path
**Animated Transition** - Smooth state changes

### Layout Patterns

**Visual Framework:**
- Consistent header, footer, sidebars
- Users learn once, use everywhere

**Center Stage:**
- Main content in center
- Supporting info on sides
- Focus on primary content

**Grid of Equals:**
- Items of equal importance
- Good for galleries and dashboards

**Responsive Patterns:**
- Vertical Stack (mobile-first)
- Generous Borders (touch-friendly)
- Bottom Navigation (thumb-zone)

### Data Display Patterns

**Two-Panel Selector:**
- List on left, details on right
- Master-detail pattern
- Efficient for browsing

**List Inlay:**
- Expand items inline
- Quick preview without navigation
- Excellent for notifications

**Thumbnail Grid:**
- Visual browsing
- Good for media content
- Visual hierarchy

### Input Patterns

**Forgiving Format:**
- Accept multiple input formats
- Auto-detect and convert
- User-friendly validation

**Autocompletion:**
- Predict and suggest completions
- Essential for search and forms
- Reduces typing and errors

**Input Hints:**
- Placeholder text
- Contextual help
- Format indicators

### Action Patterns

**Prominent "Done" Button:**
- Clear primary action
- Visually distinct
- One-click completion

**Smart Menu Items:**
- Context-aware options
- Only show relevant actions
- Reduce cognitive load

**Action Panel:**
- Group related actions
- Slide-in from side
- Quick access without modal

**Hover Tools:**
- Show on mouse hover
- Context-sensitive
- Reduce UI clutter

---

## 4. Animation & Timing Patterns

### Professional Easing Functions

**Cubic Bezier curves for natural motion:**

- **Ease In Out** `[0.42, 0, 0.58, 1]` - Smooth, natural animations
- **Ease Out** `[0, 0, 0.58, 1]` - Quick start, slow end
- **Ease In** `[0.42, 0, 1, 1]` - Slow start, quick end
- **Sharp** `[0.4, 0, 0.6, 1]` - Sharp movement
- **Elastic** `[0.68, -0.55, 0.265, 1.55]` - Elastic bounce
- **Material Standard** `[0.4, 0, 0.2, 1]` - Material Design standard
- **Deceleration** `[0, 0, 0.2, 1]` - Material Design deceleration
- **Acceleration** `[0.4, 0, 1, 1]` - Material Design acceleration

### Timing Guidelines

**Duration Standards:**
- **Instant** 100ms - Button press feedback
- **Quick** 200ms - Toggle switches, checkboxes
- **Fast** 300ms - Panel open/close, dropdowns
- **Normal** 500ms - Modal dialogs, page elements
- **Slow** 800ms - Page transitions
- **Dramatic** 1200ms - Hero animations
- **Ambient** 2000ms - Background effects, pulsing
- **Continuous** 20000ms - Continuous rotation/scrolling

### Animation Best Practices

**Performance Optimized Properties:**
- `transform` - Use for position/scale/rotation
- `opacity` - Use for fade effects
- **Avoid animating:** `width`, `height`, `left`, `top`, `margin` (causes layout reflow)

**60 FPS Guidelines:**
- Use GPU-accelerated properties (`transform`, `opacity`)
- Avoid properties that trigger layout recalculation
- Use `will-change` sparingly for known animations
- Test on lower-end devices

---

## 5. SSR (Server-Side Rendering) Best Practices

### SSR Fundamentals

**Server-Side Rendering (SSR)** renders components on the server before sending HTML to the client, providing SEO benefits, faster initial loads, and better performance.

**SSR Architecture:**
```
1. 📡 REQUEST ARRIVES → Server receives HTTP request
2. 🏗️ SERVER-SIDE RENDERING → React renders on Node.js (NO browser APIs)
3. 📤 HTML RESPONSE → Complete HTML sent to browser
4. 🔄 HYDRATION → React "hydrates" HTML, makes interactive
5. 🎯 CLIENT-SIDE NAVIGATION → Subsequent navigation uses CSR
```

### Common SSR Issues & Solutions

#### 1. "window is not defined" Error

**Most Common SSR Issue:**

```javascript
// ❌ BROKEN - Runs on server where window doesn't exist
const userAgent = window.navigator.userAgent;

// ✅ FIXED - Check if window exists
const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR';
```

**Root Cause:** Browser APIs (`window`, `document`, `navigator`) don't exist in Node.js server environment.

#### 2. Hydration Mismatch Errors

**Cause:** Server and client render different content

```javascript
// ❌ BROKEN - Different content on server vs client
function Component() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <div>{mounted ? 'Client' : 'Server'}</div>; // Hydration mismatch!
}

// ✅ FIXED - Consistent content
function Component() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return <div>Loading...</div>; // Same on server and client
  return <div>Client</div>;
}
```

### Browser API Detection Pattern

```javascript
// Basic environment detection
const isBrowser = typeof window !== 'undefined';
const isServer = typeof window === 'undefined';

// Safe API access
const userAgent = isBrowser ? navigator.userAgent : 'SSR';
const screenWidth = isBrowser ? window.screen.width : 1920;
```

### Key SSR Principles

1. **Always check for browser APIs** before using them
2. **Use consistent rendering** between server and client
3. **Implement proper cleanup** for timers and observers
4. **Test both environments** thoroughly
5. **Use progressive enhancement** for advanced features

### Common Patterns

- `typeof window !== 'undefined'` for environment detection
- Conditional rendering with `useEffect` for client-only code
- Error boundaries for graceful failure handling
- Feature detection before using browser APIs
- Proper cleanup in `useEffect` return functions

### Best Practices

- Keep server and client rendering consistent
- Use dynamic imports for heavy client-only code
- Implement proper error handling and fallbacks
- Monitor performance in both environments
- Test hydration thoroughly

---

## Quick Reference

### WebGL Key Methods
- `gl.createBuffer()` - Create buffer
- `gl.bindBuffer(target, buffer)` - Bind buffer
- `gl.bufferData(target, data, usage)` - Write data
- `gl.vertexAttribPointer()` - Assign to attribute
- `gl.enableVertexAttribArray()` - Enable attribute
- `gl.drawArrays(mode, first, count)` - Draw
- `gl.enable(gl.DEPTH_TEST)` - Enable depth testing
- `gl.enable(gl.BLEND)` - Enable blending

### Microinteraction Checklist
- [ ] Provides immediate feedback
- [ ] Reduces cognitive load
- [ ] Maintains context through transitions
- [ ] Prevents errors proactively
- [ ] Uses appropriate input methods
- [ ] Displays live preview before actions
- [ ] Includes buffer for critical actions

### Interface Pattern Checklist
- [ ] Clear entry points
- [ ] Easy escape hatches
- [ ] Progress indicators for multi-step
- [ ] Consistent visual framework
- [ ] Responsive to different screen sizes
- [ ] Keyboard shortcuts for power users
- [ ] Context-aware smart defaults

---

**Last Updated:** November 9, 2025  
**Version:** 2.1  
**Focus:** Pure UI/UX patterns and best practices
