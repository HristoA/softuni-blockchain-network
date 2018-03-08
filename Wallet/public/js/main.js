
(function ($) {
    "use strict";


    /*==================================================================
    [ Validate ]*/
    var input = $('.validate-input .input100');

    $('.validate-form').on('submit',function(){
        var check = true;

        for(var i=0; i<input.length; i++) {
            if(validate(input[i]) == false){
                showValidate(input[i]);
                check=false;
            }
        }

        return check;
    });


    $('.validate-form .input100').each(function(){
        $(this).focus(function(){
           hideValidate(this);
        });
    });

    function validate (input) {
        if($(input).attr('type') == 'email' || $(input).attr('name') == 'email') {
            if($(input).val().trim().match(/^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{1,5}|[0-9]{1,3})(\]?)$/) == null) {
                return false;
            }
        }
        else {
            if($(input).val().trim() == ''){
                return false;
            }
        }
    }

    function showValidate(input) {
        var thisAlert = $(input).parent();

        $(thisAlert).addClass('alert-validate');
    }

    function hideValidate(input) {
        var thisAlert = $(input).parent();

        $(thisAlert).removeClass('alert-validate');
    }


    /*==================================================================
    [ Custom ]*/
    $("form").submit(function(e){
        e.preventDefault();

        var form = $("form");
        form.validate()

        if(form.valid()){

            var data = {};
            data.address = $("#address").val();
            data.value   = $("#value").val();

            $.ajax({
                url: "/send",
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify( data ),
                success: function(data) {
console.log(data);
                    if(data.status == "success"){
                        $("#message").removeClass('text-warning').addClass("text-success")
                    } else {
                        $("#message").removeClass('text-success').addClass("text-warning")
                    }

                    $("#message").html(data.message).show();

                    setTimeout(function(){
                        $("#message").html("").hide();
                    }, 4000)
                }
            });
        }
    });
})(jQuery);