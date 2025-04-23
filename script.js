
document.addEventListener('DOMContentLoaded', () => {
    class GeometryGallery {
        constructor() {
            this.params = {
                size: 1.5,
                autoRotateSpeed: 0.004,
                dragSensitivity: 0.0035,
                rotationSmoothing: 0.08,
                colorChangeInterval: 5000, 
                mobileMultiplier: 0.8
            };
            
            this.state = {
                currentShape: 'sphere',
                isDragging: false,
                prevMouseX: 0,
                prevMouseY: 0,
                rotationX: 0,
                rotationY: 0,
                targetRotationX: 0,
                targetRotationY: 0,
                currentColor: new THREE.Color(0x4a6bff),
                targetColor: new THREE.Color(0x4a6bff),
                colorChangeProgress: 0,
                isMobile: /Mobi|Android/i.test(navigator.userAgent),
                lastColorChangeTime: 0
            };
            
            if (this.state.isMobile) {
                this.params.size *= this.params.mobileMultiplier;
                this.params.dragSensitivity *= 1.5;
            }
            
            this.initThree();
            this.initControls();
            this.initLoading();
            this.initEventListeners();
        }
        
        initThree() {
            // 场景设置
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x121212);
            
            // 相机设置
            this.camera = new THREE.PerspectiveCamera(
                60, window.innerWidth / window.innerHeight, 0.1, 1000
            );
            this.camera.position.z = this.state.isMobile ? 6 : 5;
            
            // 渲染器设置
            this.renderer = new THREE.WebGLRenderer({
                canvas: document.getElementById('canvas'),
                antialias: true,
                powerPreference: "high-performance"
            });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            
            const ambientLight = new THREE.AmbientLight(0x404040, 1.2);
            this.scene.add(ambientLight);
            
            this.createGeometry();
        }
        
        createGeometry() {
            if (this.geometryMesh) {
                this.scene.remove(this.geometryMesh);
                this.geometryMesh.geometry.dispose();
                this.geometryMesh.material.dispose();
            }
            
            const geometry = this.getCurrentGeometry();
            
            // 创建简约线条材质
            this.material = new THREE.LineBasicMaterial({
                color: this.state.currentColor,
                linewidth: this.state.isMobile ? 1 : 1.5
            });
            
            // 使用线框而不是实体网格
            const edges = new THREE.EdgesGeometry(geometry);
            this.geometryMesh = new THREE.LineSegments(edges, this.material);
            this.scene.add(this.geometryMesh);
            this.state.rotationX = 0;
            this.state.rotationY = 0;
            this.state.targetRotationX = 0;
            this.state.targetRotationY = 0;
            this.updateColorBasedOnShape();
            this.state.lastColorChangeTime = Date.now();
            this.animateEntrance();
        }
        
        getCurrentGeometry() {
            const size = this.params.size;
            const segments = this.state.isMobile ? 12 : 16;
            
            switch(this.state.currentShape) {
                case 'box': 
                    return new THREE.BoxGeometry(size, size, size);
                case 'cone': 
                    return new THREE.ConeGeometry(size/1.5, size*1.5, segments);
                case 'cylinder': 
                    return new THREE.CylinderGeometry(size/2, size/2, size*2, segments);
                case 'torus': 
                    return new THREE.TorusGeometry(size, size/3, segments, segments*2);
                case 'torusKnot': 
                    // 优化扭结环参数，减少复杂度
                    return new THREE.TorusKnotGeometry(size, size/4, 32, 8);
                case 'tetrahedron': 
                    return new THREE.TetrahedronGeometry(size, 0);
                case 'octahedron': 
                    return new THREE.OctahedronGeometry(size, 0);
                case 'dodecahedron': 
                    return new THREE.DodecahedronGeometry(size, 0);
                case 'icosahedron': 
                    return new THREE.IcosahedronGeometry(size, 0);
                default: // sphere
                    return new THREE.SphereGeometry(size, segments, segments);
            }
        }
        
        updateColorBasedOnShape() {
            const hueMap = {
                sphere: 220,    // 蓝色
                box: 0,         // 红色
                cone: 30,       // 橙色
                cylinder: 180,  // 青色
                torus: 270,     // 紫色
                torusKnot: 300, // 粉红
                tetrahedron: 120, // 绿色
                octahedron: 60,   // 黄色
                dodecahedron: 240, // 蓝色
                icosahedron: 150   // 蓝绿色
            };
            
            const baseHue = hueMap[this.state.currentShape] || Math.random() * 360;
            this.state.currentColor.setHSL(baseHue/360, 0.8, 0.7);
            this.state.targetColor.setHSL(baseHue/360, 0.8, 0.7);
            this.material.color.copy(this.state.currentColor);
            this.material.needsUpdate = true;
        }
        
        updateColorTransition(currentTime) {
            if (currentTime - this.state.lastColorChangeTime >= this.params.colorChangeInterval) {
                this.state.lastColorChangeTime = currentTime;
                this.state.colorChangeProgress = 0;
                
                const hueMap = {
                    sphere: 220,
                    box: 0,
                    cone: 30,
                    cylinder: 180,
                    torus: 270,
                    torusKnot: 300,
                    tetrahedron: 120,
                    octahedron: 60,
                    dodecahedron: 240,
                    icosahedron: 150
                };
                
                const baseHue = hueMap[this.state.currentShape] || Math.random() * 360;
                const targetHue = (baseHue + Math.random() * 120 - 60) % 360;
                
                this.state.currentColor.copy(this.material.color);
                this.state.targetColor.setHSL(targetHue/360, 0.8, 0.7);
            }
            
            if (this.state.colorChangeProgress < 1) {
                this.state.colorChangeProgress += 0.01;
                const t = Math.min(this.state.colorChangeProgress, 1);
                
                const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                
                this.material.color.lerpColors(
                    this.state.currentColor,
                    this.state.targetColor,
                    easeT
                );
                this.material.needsUpdate = true;
            }
        }
        
        animateEntrance() {
            this.geometryMesh.position.set(0, 0, 0);
            this.geometryMesh.scale.set(0.1, 0.1, 0.1);
            this.geometryMesh.rotation.set(0, 0, 0);
            
            gsap.to(this.geometryMesh.scale, {
                x: 1, y: 1, z: 1,
                duration: 0.8,
                ease: "sine.out"
            });
        }
        
        initControls() {
            const buttons = document.querySelectorAll('.shape-btn');
            const shapeNameDisplay = document.querySelector('.shape-name');
            
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    const shapeName = btn.textContent.trim();
                    shapeNameDisplay.textContent = shapeName;
                    
                    if (this.state.currentShape !== btn.dataset.shape) {
                        this.state.currentShape = btn.dataset.shape;
                        this.animateShapeChange();
                    }
                });
            });
        }
        
        animateShapeChange() {
            gsap.killTweensOf(this.geometryMesh.scale);
            
            gsap.to(this.geometryMesh.scale, {
                x: 0.1, y: 0.1, z: 0.1,
                duration: 0.4,
                ease: "power2.in",
                onComplete: () => {
                    this.createGeometry();
                }
            });
        }
        
        initLoading() {
            setTimeout(() => {
                gsap.to('.loading', {
                    opacity: 0,
                    duration: 0.6,
                    onComplete: () => {
                        document.querySelector('.loading').style.display = 'none';
                        this.animate();
                    }
                });
            }, 1200);
        }
        
        initEventListeners() {
            const onPointerDown = (e) => {
                this.state.isDragging = true;
                this.state.prevMouseX = e.clientX || e.touches[0].clientX;
                this.state.prevMouseY = e.clientY || e.touches[0].clientY;
            };
            
            const onPointerMove = (e) => {
                if (!this.state.isDragging) return;
                
                const mouseX = e.clientX || e.touches[0].clientX;
                const mouseY = e.clientY || e.touches[0].clientY;
                
                const deltaX = mouseX - this.state.prevMouseX;
                const deltaY = mouseY - this.state.prevMouseY;
                
                this.state.targetRotationY += deltaX * this.params.dragSensitivity;
                this.state.targetRotationX += deltaY * this.params.dragSensitivity;
                
                this.state.prevMouseX = mouseX;
                this.state.prevMouseY = mouseY;
            };
            
            const onPointerUp = () => {
                this.state.isDragging = false;
            };
            
            document.addEventListener('mousedown', onPointerDown);
            document.addEventListener('mousemove', onPointerMove);
            document.addEventListener('mouseup', onPointerUp);
            
            document.addEventListener('touchstart', onPointerDown);
            document.addEventListener('touchmove', onPointerMove);
            document.addEventListener('touchend', onPointerUp);
            
            window.addEventListener('resize', () => {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            });
        }
        
        animate() {
            requestAnimationFrame(() => this.animate());
            const currentTime = Date.now();
            
            if (!this.state.isDragging) {
                this.state.targetRotationY += this.params.autoRotateSpeed;
            }
            
            this.state.rotationX += (this.state.targetRotationX - this.state.rotationX) * this.params.rotationSmoothing;
            this.state.rotationY += (this.state.targetRotationY - this.state.rotationY) * this.params.rotationSmoothing;
            
            this.geometryMesh.rotation.x = this.state.rotationX;
            this.geometryMesh.rotation.y = this.state.rotationY;
            
            this.updateColorTransition(currentTime);
            
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    new GeometryGallery();
});
