/* Wick - (c) 2017 Zach Rispoli, Luca Damasco, and Josh Rispoli */

/*  This file is part of Wick. 
    
    Wick is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Wick is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Wick.  If not, see <http://www.gnu.org/licenses/>. */
    
var WickPlayer = function () {

    var self = this;

    self.running = false;

    var initialStateProject;
    var stats;

    self.runProject = function (projectJSON) {

        /*stats = new Stats();
        stats.showPanel(0);
        document.body.appendChild( stats.dom );*/

        try {
            if(window.parent && window.parent.wickEditor) window.wickEditor = window.parent.wickEditor;
        } catch (e) {
            console.log(e)
        }

        self.running = true;

        self.canvasContainer = document.getElementById('playerCanvasContainer');

        resetElapsedTime();

        // Load the project!
        self.project = WickProject.fromJSON(projectJSON);
        initialStateProject = WickProject.fromJSON(projectJSON);

        self.canvasContainer.style.width = self.project.width+'px';
        self.canvasContainer.style.height = self.project.height+'px';
        self.canvasContainer.style.backgroundColor = self.project.backgroundColor;

        self.project.rootObject.generateObjectNameReferences(self.project.rootObject);
        initialStateProject.rootObject.generateObjectNameReferences(initialStateProject.rootObject);

        self.project.prepareForPlayer();
        initialStateProject.prepareForPlayer();

        // Make the camera
        window.camera = new WickCamera(self.project);

        // Setup renderer/input/audio player
        self.renderer = new WickPixiRenderer(self.canvasContainer);
        self.inputHandler = new WickPlayerInputHandler(self.canvasContainer, self.project);
        self.audioPlayer = new WickHowlerAudioPlayer(self.project);

        self.inputHandler.setup(); 
        if(!bowser.mobile && !bowser.tablet) self.audioPlayer.setup();

        update(false);
    }

    window.runProject = function (projectJSON) {
        self.runProject(projectJSON)
    }

    self.stopRunningProject = function () {

        self.running = false;

        update();
        clearTimeout(loopTimeout);

        self.project = null;

        self.inputHandler.cleanup();
        self.audioPlayer.cleanup();
    }

    var loopTimeout;
    var update = function (firstTick) {

        if(!self.running) return;

        if(stats) stats.begin();

        if(self.project.framerate < 60) {
            loopTimeout = setTimeout(function() {

                if(self.running) {

                    if(!firstTick) self.project.tick();
                    if(self.project) self.renderer.renderWickObjects(self.project, self.project.rootObject.getAllActiveChildObjects(), null, true);
                    self.inputHandler.update(false);

                    update();
                }
            }, 1000 / self.project.framerate);

        } else {

            if(self.running) {
                requestAnimationFrame(function () { update(false) });
            }
            if(!firstTick) self.project.tick();
            self.renderer.renderWickObjects(self.project, self.project.rootObject.getAllActiveChildObjects(), null, true);
            self.inputHandler.update();

        }

        if(stats) stats.end();

    }


///////////// DEPRECATED ZOOOOOONE!!!!!!!!!!!!!!!!!!!!!!!

    self.cloneObject = function (wickObj) {
        var clone = wickObj.copy();
        clone.name = undefined;
        clone.isClone = true;
        clone.asset = wickObj.asset;

        clone.objectClonedFrom = wickObj;

        clone.prepareForPlayer()

        clone.parentObject = wickObj.parentObject;
        clone.parentObject.getCurrentLayer().getCurrentFrame().wickObjects.push(clone);
        self.project.rootObject.generateParentObjectReferences();

        return clone;
    }

    self.deleteObject = function (wickObj) {
        self.renderer.cleanupObjectTextures(wickObj);
        wickObj.remove();
    }

    self.resetStateOfObject = function (wickObject) {

        // Clones go away because they have no original state! :O
        if(wickObject.isClone) {
            self.deleteObject(wickObject)
            return;
        }

        var initialStateObject = initialStateProject.getObjectByUUID(wickObject.uuid);
        if(!initialStateObject) return;

        // TOXXXIC
        //console.log("-------------");
        var blacklist = ['_hitBox', 'asset', 'alphaMask', 'pixiSprite', 'pixiContainer', 'pixiText', 'audioData', 'wickScripts', 'parentObject', 'layers', '_active', '_wasActiveLastTick', '_scopeWrapper', 'parentFrame', 'bbox', 'tweens'];
        for (var name in wickObject) {
            if (name !== 'undefined' && wickObject.hasOwnProperty(name) && blacklist.indexOf(name) === -1) {
                if(initialStateObject[name] !== wickObject[name]) {
                    wickObject[name] = initialStateObject[name];
                }
            }
        }
        
        wickObject.hoveredOver = false;
        wickObject.playheadPosition = 0;
        wickObject._playing = true;

        // Don't forget to reset the childrens states
        if(wickObject.isSymbol) {
            wickObject.getAllChildObjects().forEach(function (child) {
                wickPlayer.resetStateOfObject(child);
            });
        }

    }

}

// this is temporary, need a better system for this...
function runProject (json) {
    window.wickPlayer = new WickPlayer(); 
    window.wickPlayer.runProject(json);
}
