require.config({
    shim: {
        "webgl-utils": {
            exports: "WebGLUtils"
        },
        "glmatrix/mat4": {
            deps: ["glmatrix/common"],
            exports: "mat4"
        },
    },
    paths: {
        "webgl-utils": "3rdparty/webgl-utils",
        "jquery": "3rdparty/jquery-2.0.3.min",
        "glmatrix": "3rdparty/glmatrix"
    }
});


require(["webgl-utils", "glmatrix/mat4", "jquery"], function(glUtils, mat4, $) {

    var compileShader = function (gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            throw "Can't compile shader: " + gl.getShaderInfoLog(shader);
        return shader;
    }

    var linkShaderProgram = function (gl, shaders) {
        var shaderProgram = gl.createProgram();
        for (var i=0; i<shaders.length; i++) {
            gl.attachShader(shaderProgram, shaders[i]);
        }
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
            throw "Can't link shader program" + ": " + gl.getProgramInfoLog(shaderProgram);
        return shaderProgram;
    }

    var mandelbrotMetric = function (cre, cim) {
        var re = cre, im = cim;
        for (var i=0; i<100; i++) {
            var re1 = re*re - im*im + cre;
            im = 2.0*re*im + cim;
            re = re1;
            if (Math.abs(re) > 3.3)
                return i;
        }
        return 100;
    }

    var render = function (gl, pos) {
        // years passed, and I can't remember what parameters
        // i'm used in my old dos program...
        // with this parameters it looks like a shit ;(
        while (true) {
            var m1 = mandelbrotMetric(pos.x + pos.dx, pos.y + pos.dy);
            if (m1 >= 8 && m1 <= 90)
                break;
            pos.dx = Math.random() - 0.5;
            pos.dy = Math.random() - 0.5;
            var l = Math.sqrt(pos.dx*pos.dx + pos.dy*pos.dy) * 2000.0;
            pos.dx /= l;
            pos.dy /= l;
        }
        pos.set(pos.x + pos.dx, pos.y + pos.dy);

        gl.viewport(0, 0, 640, 480); // yeah, i'm lazy pig, i know...
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }

    var main = function (resources) {
        $("#loading").hide();
        $("#canvas").show();

        var canvas = document.getElementById("canvas");
        var gl = glUtils.setupWebGL(canvas);

        var vertexShader = compileShader(gl, gl.VERTEX_SHADER, resources['julia.vertex']);
        var fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, resources['julia.fragment']);
        var shaderProgram = linkShaderProgram(gl, [vertexShader, fragmentShader]);

        gl.useProgram(shaderProgram);

        var w = 640.0 / 480.0, h = 1.0;
        var planeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, planeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -w, -h,
            -w, h,
            w, h,
            w, -h
        ]), gl.STATIC_DRAW);


        var vertexAttrib = gl.getAttribLocation(shaderProgram, "vertex");
        gl.enableVertexAttribArray(vertexAttrib);
        gl.bindBuffer(gl.ARRAY_BUFFER, planeBuffer);
        gl.vertexAttribPointer(vertexAttrib, 2, gl.FLOAT, false, 0, 0);

        var offsetUniform = gl.getUniformLocation(shaderProgram, "offset");
        gl.uniform2fv(offsetUniform, new Float32Array([0.0, 0.0]));

        var zoomUniform = gl.getUniformLocation(shaderProgram, "zoom");
        gl.uniform1f(zoomUniform, 1.0);

        var Uniform = function (location) {
            this.x = 0.0;
            this.y = 0.0;
            this.set = function (x, y) {
                this.x = x;
                this.y = y;
                gl.uniform2f(location, x, y);
            }
        };

        var pos = new Uniform(gl.getUniformLocation(shaderProgram, "c"));
        pos.set(-0.55, -0.55);
        pos.dx = 0.0002;
        pos.dy = 0.0005;

        var projectionUniform = gl.getUniformLocation(shaderProgram, "projection");
        var projection = mat4.create();
        mat4.ortho(projection,  -w, w, -h, h, -1.0, 1.0);
        gl.uniformMatrix4fv(projectionUniform, false, projection);

        var renderLoop = function() {
            window.requestAnimFrame(renderLoop, canvas);
            render(gl, pos);
        }
        renderLoop();
    }

    window.onerror = function (msg, url, line) {
        $("#loading").hide();
        $("#canvas").hide();
        $("#error").html("<p>Sorry :(</p><p>" + url + ":" + line + "</p><pre>" + msg + "</pre>");
        $("#error").show();
        return false;
    };

    // TODO: implement resource manager
    $.ajaxSetup({
        cache: false
    });
    $.get('shaders/julia.vertex').done(function(vertexShaderSource) {
        $.get('shaders/julia.fragment').done(function(fragmentShaderSource) {
            main({
                "julia.vertex": vertexShaderSource,
                "julia.fragment": fragmentShaderSource
            });
        }).fail(function() {
            throw "Can't download vertex shader";
        });
    }).fail(function() {
        throw "Can't download vertex shader";
    });

});