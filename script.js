// Configuration settings for the particles
const settings = {
    particles: {
        length: 500,      // Maximum amount of particles
        duration: 2,      // Particle duration in seconds
        velocity: 100,    // Particle velocity in pixels/sec
        effect: -0.75,    // Particle effect parameter
        size: 30          // Particle size in pixels
    }
};

// RequestAnimationFrame polyfill by Erik Möller
(function() {
    let lastTime = 0;
    const vendors = ['ms', 'moz', 'webkit', 'o'];
    
    for (let x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || 
                                    window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback) {
            const currTime = new Date().getTime();
            const timeToCall = Math.max(0, 16 - (currTime - lastTime));
            const id = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());

// Point class for vector operations
class Point {
    constructor(x, y) {
        this.x = (typeof x !== 'undefined') ? x : 0;
        this.y = (typeof y !== 'undefined') ? y : 0;
    }
    
    clone() {
        return new Point(this.x, this.y);
    }
    
    length(length) {
        if (typeof length === 'undefined') {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }
        
        this.normalize();
        this.x *= length;
        this.y *= length;
        return this;
    }
    
    normalize() {
        const length = this.length();
        this.x /= length;
        this.y /= length;
        return this;
    }
}

// Particle class for individual particles
class Particle {
    constructor() {
        this.position = new Point();
        this.velocity = new Point();
        this.acceleration = new Point();
        this.age = 0;
    }
    
    initialize(x, y, dx, dy) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = dx;
        this.velocity.y = dy;
        this.acceleration.x = dx * settings.particles.effect;
        this.acceleration.y = dy * settings.particles.effect;
        this.age = 0;
    }
    
    update(deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.age += deltaTime;
    }
    
    draw(context, image) {
        function ease(t) {
            return (--t) * t * t + 1;
        }
        
        const size = image.width * ease(this.age / settings.particles.duration);
        context.globalAlpha = 1 - this.age / settings.particles.duration;
        context.drawImage(image, this.position.x - size / 2, this.position.y - size / 2, size, size);
    }
}

// ParticlePool class for managing particles efficiently
class ParticlePool {
    constructor(length) {
        this.particles = new Array(length);
        this.firstActive = 0;
        this.firstFree = 0;
        this.duration = settings.particles.duration;
        
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i] = new Particle();
        }
    }
    
    add(x, y, dx, dy) {
        this.particles[this.firstFree].initialize(x, y, dx, dy);
        
        // Handle circular queue
        this.firstFree++;
        if (this.firstFree === this.particles.length) this.firstFree = 0;
        if (this.firstActive === this.firstFree) this.firstActive++;
        if (this.firstActive === this.particles.length) this.firstActive = 0;
    }
    
    update(deltaTime) {
        let i;
        
        // Update active particles
        if (this.firstActive < this.firstFree) {
            for (i = this.firstActive; i < this.firstFree; i++) {
                this.particles[i].update(deltaTime);
            }
        }
        
        if (this.firstFree < this.firstActive) {
            for (i = this.firstActive; i < this.particles.length; i++) {
                this.particles[i].update(deltaTime);
            }
            for (i = 0; i < this.firstFree; i++) {
                this.particles[i].update(deltaTime);
            }
        }
        
        // Remove inactive particles
        while (this.particles[this.firstActive].age >= this.duration && this.firstActive !== this.firstFree) {
            this.firstActive++;
            if (this.firstActive === this.particles.length) this.firstActive = 0;
        }
    }
    
    draw(context, image) {
        // Draw active particles
        if (this.firstActive < this.firstFree) {
            for (let i = this.firstActive; i < this.firstFree; i++) {
                this.particles[i].draw(context, image);
            }
        }
        
        if (this.firstFree < this.firstActive) {
            for (let i = this.firstActive; i < this.particles.length; i++) {
                this.particles[i].draw(context, image);
            }
            for (let i = 0; i < this.firstFree; i++) {
                this.particles[i].draw(context, image);
            }
        }
    }
}

// Main animation function
(function(canvas) {
    const context = canvas.getContext('2d');
    const particles = new ParticlePool(settings.particles.length);
    const particleRate = settings.particles.length / settings.particles.duration; // particles/sec
    let time;
    
    // Get point on heart with -PI <= t <= PI
    function pointOnHeart(t) {
        return new Point(
            160 * Math.pow(Math.sin(t), 3),
            130 * Math.cos(t) - 50 * Math.cos(2 * t) - 20 * Math.cos(3 * t) - 10 * Math.cos(4 * t) + 25
        );
    }
    
    // Create the particle image using a dummy canvas
    const image = (function() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = settings.particles.size;
        canvas.height = settings.particles.size;
        
        // Helper function to create the path
        function to(t) {
            const point = pointOnHeart(t);
            point.x = settings.particles.size / 2 + point.x * settings.particles.size / 350;
            point.y = settings.particles.size / 2 - point.y * settings.particles.size / 350;
            return point;
        }
        
        // Create the heart path
        context.beginPath();
        let t = -Math.PI;
        let point = to(t);
        context.moveTo(point.x, point.y);
        
        while (t < Math.PI) {
            t += 0.01; // Small steps for smooth curve
            point = to(t);
            context.lineTo(point.x, point.y);
        }
        
        context.closePath();
        
        // Create the fill
        context.fillStyle = '#ea80b0';
        context.fill();
        
        // Create the image
        const image = new Image();
        image.src = canvas.toDataURL();
        return image;
    })();
    
    // Add particles on mouse click
    canvas.addEventListener('click', function(e) {
        const pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
        const dir = pos.clone().length(settings.particles.velocity);
        particles.add(e.clientX, e.clientY, dir.x, -dir.y);
    });
    
    // Render function
    function render() {
        // Next animation frame
        requestAnimationFrame(render);
        
        // Update time
        const newTime = new Date().getTime() / 1000;
        const deltaTime = newTime - (time || newTime);
        time = newTime;
        
        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Create new particles
        const amount = particleRate * deltaTime;
        for (let i = 0; i < amount; i++) {
            const pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
            const dir = pos.clone().length(settings.particles.velocity);
            particles.add(canvas.width / 2 + pos.x, canvas.height / 2 - pos.y, dir.x, -dir.y);
        }
        
        // Update and draw particles
        particles.update(deltaTime);
        particles.draw(context, image);
    }
    
    // Handle (re-)sizing of the canvas
    function onResize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    
    window.addEventListener('resize', onResize);
    
    // Initialize and start rendering
    setTimeout(function() {
        onResize();
        render();
    }, 10);
    
})(document.getElementById('pinkboard'));
