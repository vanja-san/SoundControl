var ASM = Java.type("net.minecraftforge.coremod.api.ASMAPI");

var Opcodes = Java.type('org.objectweb.asm.Opcodes');
var InsnList = Java.type('org.objectweb.asm.tree.InsnList');
var VarInsnNode = Java.type('org.objectweb.asm.tree.VarInsnNode');
var FieldInsnNode = Java.type('org.objectweb.asm.tree.FieldInsnNode');
var InsnNode = Java.type('org.objectweb.asm.tree.InsnNode');

var SOUND_ENGINE_LOAD = ASM.mapMethod("func_148608_i");
var SOUND_ENGINE_UNLOAD = ASM.mapMethod("func_148613_b");
var SOUND_SYSTEM_INITIALIZE = ASM.mapMethod("func_216404_a");
var SOUND_SYSTEM_DEINITIALIZE = ASM.mapMethod("func_216409_b");
var SOUND_MANAGER = ASM.mapField("field_217937_g");
var GET_CLAMPED_VOLUME = ASM.mapMethod("func_188770_e");
var PLAY_SOUND = ASM.mapMethod("func_148611_c");
var RUN_SOUND_EXECUTOR = ASM.mapMethod("func_217888_a");

var FORMAT = "[soundengine.js] {}";

function initializeCoreMod()
{
    return {
        "sndctrl_soundengine_transformer": {
            "target": {
                "type": "CLASS",
                "names": function(listofclasses) { return ["net.minecraft.client.audio.SoundEngine"]; }
            },
            "transformer": function(classNode) {

                var initCall = ASM.buildMethodCall(
                    "org/orecruncher/sndctrl/audio/SoundUtils",
                    "initialize",
                    "(Lnet/minecraft/client/audio/SoundSystem;)V",
                    ASM.MethodType.STATIC
                );

                var newInstructions = new InsnList();
                newInstructions.add(new VarInsnNode(Opcodes.ALOAD, 0));
                newInstructions.add(new FieldInsnNode(Opcodes.GETFIELD, "net/minecraft/client/audio/SoundEngine", SOUND_MANAGER, "Lnet/minecraft/client/audio/SoundSystem;"));
                newInstructions.add(initCall);

                var targetMethod = findMethod(classNode, SOUND_ENGINE_LOAD);
                if (targetMethod !== null) {
                    ASM.insertInsnList(targetMethod, ASM.MethodType.VIRTUAL, "net/minecraft/client/audio/SoundSystem", SOUND_SYSTEM_INITIALIZE, "()V", newInstructions, ASM.InsertMode.INSERT_AFTER);
                    ASM.log("INFO", FORMAT, ["Hooked SoundEngine.load()"]);
                } else {
                    ASM.log("WARN", FORMAT, ["Sound system will not initialize properly and features will be missing"]);
                }

                var deinitCall = ASM.buildMethodCall(
                    "org/orecruncher/sndctrl/audio/SoundUtils",
                    "deinitialize",
                    "(Lnet/minecraft/client/audio/SoundSystem;)V",
                    ASM.MethodType.STATIC
                );

                newInstructions = new InsnList();
                newInstructions.add(new VarInsnNode(Opcodes.ALOAD, 0));
                newInstructions.add(new FieldInsnNode(Opcodes.GETFIELD, "net/minecraft/client/audio/SoundEngine", SOUND_MANAGER, "Lnet/minecraft/client/audio/SoundSystem;"));
                newInstructions.add(deinitCall);

                targetMethod = findMethod(classNode, SOUND_ENGINE_UNLOAD);
                if (targetMethod !== null) {
                    ASM.insertInsnList(targetMethod, ASM.MethodType.VIRTUAL, "net/minecraft/client/audio/SoundSystem", SOUND_SYSTEM_DEINITIALIZE, "()V", newInstructions, ASM.InsertMode.INSERT_BEFORE);
                    ASM.log("INFO", FORMAT, ["Hooked SoundEngine.unload()"]);
                } else {
                    ASM.log("WARN", FORMAT, ["Sound system will not deinitialize properly; resource reload will cause issues"]);
                }

                var clamped = ASM.buildMethodCall(
                    "org/orecruncher/sndctrl/audio/handlers/SoundVolumeEvaluator",
                    "getClampedVolume",
                    "(Lnet/minecraft/client/audio/ISound;)F",
                    ASM.MethodType.STATIC
                );

                newInstructions = new InsnList();
                newInstructions.add(new VarInsnNode(Opcodes.ALOAD, 1));
                newInstructions.add(clamped);
                newInstructions.add(new InsnNode(Opcodes.FRETURN));

                var targetMethod = findMethod(classNode, GET_CLAMPED_VOLUME);
                if (targetMethod !== null) {
                    targetMethod.instructions.insert(newInstructions);
                    ASM.log("INFO", FORMAT, ["Hooked SoundEngine.getClampedVolume()"]);
                } else {
                    ASM.log("WARN", FORMAT, ["Sounds will not dynamically scale sound volume"]);
                }

                var playSound = ASM.buildMethodCall(
                    "org/orecruncher/sndctrl/audio/handlers/SoundFXProcessor",
                    "onSoundPlay",
                    "(Lnet/minecraft/client/audio/ISound;Lnet/minecraft/client/audio/ChannelManager$Entry;)V",
                    ASM.MethodType.STATIC
                );

                newInstructions = new InsnList();
                newInstructions.add(new VarInsnNode(Opcodes.ALOAD, 1));
                newInstructions.add(new VarInsnNode(Opcodes.ALOAD, 14));
                newInstructions.add(playSound);

                var targetMethod = findMethod(classNode, PLAY_SOUND);
                if (targetMethod !== null) {
                    ASM.insertInsnList(targetMethod, ASM.MethodType.VIRTUAL, "net/minecraft/client/audio/ChannelManager$Entry", RUN_SOUND_EXECUTOR, "(Ljava/util/function/Consumer;)V", newInstructions, ASM.InsertMode.INSERT_AFTER);
                    ASM.log("INFO", FORMAT, ["Hooked SoundEngine.play()"]);
                } else {
                    ASM.log("WARN", FORMAT, ["Special effects (reverb, filtering) will not be associated with sound execution"]);
                }

                return classNode;
            }
        }
    };
}

function findMethod(classNode, methodName)
{
    for each (var method in classNode.methods)
    {
        if (method.name == methodName)
            return method;
    }
    ASM.log("WARN", "Method not found: {}", [methodName]);
    return null;
}
