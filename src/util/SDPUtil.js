const SDPUtil = {
    /**
     * Sets the given codecName as the preferred codec by
     *  moving it to the beginning of the payload types
     *  list (modifies the given mline in place).  If there
     *  are multiple options within the same codec (multiple h264
     *  profiles, for instance), this will prefer the first one
     *  that is found.
     * @param {object} videoMLine the video mline object from
     *  an sdp as parsed by transform.parse
     * @param {string} codecName the name of the preferred codec
     */
    preferVideoCodec(videoMLine, codecName) {
        let payloadType = null;

        if (!videoMLine || !codecName) {
            return;
        }

        for (let i = 0; i < videoMLine.rtp.length; ++i) {
            const rtp = videoMLine.rtp[i];

            if (rtp.codec
                && rtp.codec.toLowerCase() === codecName.toLowerCase()) {
                payloadType = rtp.payload;
                break;
            }
        }
        if (payloadType) {
            // Call toString() on payloads to get around an issue within
            // SDPTransform that sets payloads as a number, instead of a string,
            // when there is only one payload.
            const payloadTypes
                = videoMLine.payloads
                .toString()
                .split(' ')
                .map(p => parseInt(p, 10));
            const payloadIndex = payloadTypes.indexOf(payloadType);

            payloadTypes.splice(payloadIndex, 1);
            payloadTypes.unshift(payloadType);
            videoMLine.payloads = payloadTypes.join(' ');
        }
    },

    /**
     * Strips the given codec from the given mline. All related RTX payload
     * types are also stripped. If the resulting mline would have no codecs,
     * it's disabled.
     *
     * @param {object} videoMLine the video mline object from an sdp as parsed
     * by transform.parse.
     * @param {string} codecName the name of the codec which will be stripped.
     */
    stripVideoCodec(videoMLine, codecName) {
        if (!videoMLine || !codecName) {
            return;
        }

        const removePts = [];

        for (const rtp of videoMLine.rtp) {
            if (rtp.codec
                && rtp.codec.toLowerCase() === codecName.toLowerCase()) {
                removePts.push(rtp.payload);
            }
        }

        if (removePts.length > 0) {
            // We also need to remove the payload types that are related to RTX
            // for the codecs we want to disable.
            const rtxApts = removePts.map(item => `apt=${item}`);
            const rtxPts = videoMLine.fmtp.filter(
                item => rtxApts.indexOf(item.config) !== -1);

            removePts.push(...rtxPts.map(item => item.payload));

            // Call toString() on payloads to get around an issue within
            // SDPTransform that sets payloads as a number, instead of a string,
            // when there is only one payload.
            const allPts = videoMLine.payloads
                .toString()
                .split(' ')
                .map(Number);
            const keepPts = allPts.filter(pt => removePts.indexOf(pt) === -1);

            if (keepPts.length === 0) {
                // There are no other video codecs, disable the stream.
                videoMLine.port = 0;
                videoMLine.direction = 'inactive';
                videoMLine.payloads = '*';
            } else {
                videoMLine.payloads = keepPts.join(' ');
            }

            videoMLine.rtp = videoMLine.rtp.filter(
                item => keepPts.indexOf(item.payload) !== -1);
            videoMLine.fmtp = videoMLine.fmtp.filter(
                item => keepPts.indexOf(item.payload) !== -1);
            if (videoMLine.rtcpFb) {
                videoMLine.rtcpFb = videoMLine.rtcpFb.filter(
                    item => keepPts.indexOf(item.payload) !== -1);
            }
        }
    }
};

export default SDPUtil;
